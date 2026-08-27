import { Injectable, Logger } from '@nestjs/common';
import { fetchWithRetry } from '../../common/http/retry.util';
import { StorageService } from '../../common/storage/storage.service';
import { WhatsappRoutingService } from './whatsapp-routing.service';

/**
 * Los únicos adjuntos que el taller necesita leer. Video y sticker se
 * descartan a propósito: no aportan nada al chat de servicio y son el vector
 * más común de archivos pesados que no hace falta pagar en B2.
 */
export type WhatsappMediaType = 'image' | 'audio' | 'document';

export interface WhatsappMediaDownloadParams {
  tenantId: string;
  branchId: string;
  conversationId: string;
  /** `id` de Meta del mensaje al que pertenece el adjunto. Da nombre a la key. */
  waMessageId: string;
  /** `id` del media en Meta (`msg.image.id`, `msg.audio.id`, `msg.document.id`). */
  mediaId: string;
  mediaType: WhatsappMediaType;
}

/**
 * Los tipos MIME que de verdad se guardan, por categoría.
 *
 * Es lista blanca, no lista negra: un tipo que Meta no manda hoy (o que llega
 * mal etiquetado) se rechaza en vez de subirse a ciegas a B2.
 */
const ALLOWED_MIME_TYPES: Record<WhatsappMediaType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
  document: ['application/pdf'],
};

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/amr': 'amr',
  'audio/ogg': 'ogg',
  'application/pdf': 'pdf',
};

/**
 * Tope por tipo. Los de imagen y audio son los mismos que ya usa Meta para
 * aceptar el envío —no tiene caso guardar algo que Meta no habría dejado
 * mandar—; el de documento se recorta a propósito: Meta permite hasta 100 MB,
 * pero no hay caso de uso de taller (una foto de la factura, un comprobante)
 * que necesite algo así de grande, y evita que un PDF fuera de tamaño se cuele
 * en cada conversación.
 */
const MAX_BYTES: Record<WhatsappMediaType, number> = {
  image: 5 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 20 * 1024 * 1024,
};

interface MetaMediaInfo {
  url: string;
  mimeType: string;
  fileSize: number | null;
}

/**
 * Baja un adjunto de WhatsApp y lo sube a B2.
 *
 * Meta lo entrega en dos pasos: `GET /{media_id}` da una URL temporal (dura
 * minutos, no horas), y esa URL se descarga aparte con el mismo Bearer token
 * de la sucursal. Por eso la consulta a Meta se hace en el momento de
 * procesar el job y no al recibir el webhook: si sólo se guardara la URL,
 * podría haber vencido para cuando le tocara su turno en la cola.
 *
 * Nunca tumba a quien la llama por un archivo que no se pudo bajar: el
 * cliente que mandó la foto ya tiene su mensaje guardado (texto y
 * `attachmentType`); lo único que falta es la key. Los fallos que no vale la
 * pena reintentar (tipo no permitido, tamaño excedido, sin credenciales, Meta
 * contestó 4xx) devuelven `null`. Los que sí conviene reintentar (red caída,
 * B2 no responde) se dejan salir como excepción para que la cola de BullMQ
 * los reintente con backoff.
 */
@Injectable()
export class WhatsappMediaService {
  private readonly logger = new Logger(WhatsappMediaService.name);

  constructor(
    private readonly routing: WhatsappRoutingService,
    private readonly storage: StorageService,
  ) {}

  async download(params: WhatsappMediaDownloadParams): Promise<string | null> {
    const creds = await this.routing.credentialsFor(params.branchId);
    if (!creds) {
      this.logger.warn(
        `Sin credenciales de WhatsApp en la sucursal ${params.branchId}: no se pudo bajar el adjunto del mensaje ${params.waMessageId}`,
      );
      return null;
    }

    const info = await this.fetchMediaInfo(params.mediaId, creds.token);
    if (!info) return null;

    const allowed = ALLOWED_MIME_TYPES[params.mediaType];
    if (!allowed.includes(info.mimeType)) {
      this.logger.warn(
        `Adjunto rechazado: tipo ${info.mimeType} no permitido para ${params.mediaType} (mensaje ${params.waMessageId})`,
      );
      return null;
    }

    const maxBytes = MAX_BYTES[params.mediaType];
    if (info.fileSize && info.fileSize > maxBytes) {
      this.logger.warn(
        `Adjunto rechazado: ${info.fileSize} bytes excede el tope de ${maxBytes} para ${params.mediaType} (mensaje ${params.waMessageId})`,
      );
      return null;
    }

    const buffer = await this.downloadBinary(info.url, creds.token);
    if (!buffer) return null;

    // Meta no siempre manda `file_size` en el paso 1; con el archivo ya en
    // mano, el tamaño real manda sobre lo que haya dicho el metadato.
    if (buffer.length > maxBytes) {
      this.logger.warn(
        `Adjunto rechazado tras descargarlo: ${buffer.length} bytes excede el tope de ${maxBytes} para ${params.mediaType} (mensaje ${params.waMessageId})`,
      );
      return null;
    }

    const ext = MIME_EXTENSIONS[info.mimeType] ?? 'bin';
    const key = `whatsapp/${params.tenantId}/${params.conversationId}/${params.waMessageId}.${ext}`;

    try {
      await this.storage.upload(buffer, key, info.mimeType);
    } catch (e) {
      // Sí se reintenta: un corte hacia B2 es justo el caso transitorio que
      // amerita otro intento de la cola.
      this.logger.error(
        `No se pudo subir a B2 el adjunto del mensaje ${params.waMessageId}`,
        e,
      );
      throw e;
    }

    return key;
  }

  /** Paso 1 de Meta: del `media_id` a una URL temporal y su tipo real. */
  private async fetchMediaInfo(
    mediaId: string,
    token: string,
  ): Promise<MetaMediaInfo | null> {
    const response = await fetchWithRetry(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        // El media id venció o no es de esta cuenta: reintentar no lo arregla.
        this.logger.warn(
          `Meta rechazó la consulta del media ${mediaId} (HTTP ${response.status})`,
        );
        return null;
      }
      throw new Error(`Meta media info error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      url?: string;
      mime_type?: string;
      file_size?: number;
    };
    if (!data.url || !data.mime_type) {
      this.logger.warn(`Meta no devolvió url/mime_type para media ${mediaId}`);
      return null;
    }

    return {
      url: data.url,
      // Algunos tipos vienen con `; charset=...` de cola; sólo interesa el
      // tipo para compararlo contra la lista blanca.
      mimeType: data.mime_type.split(';')[0].trim(),
      fileSize: data.file_size ?? null,
    };
  }

  /** Paso 2: la URL temporal se baja con el mismo Bearer, no con la del media. */
  private async downloadBinary(
    url: string,
    token: string,
  ): Promise<Buffer | null> {
    const response = await fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        this.logger.warn(
          `Meta rechazó la descarga del adjunto (HTTP ${response.status})`,
        );
        return null;
      }
      throw new Error(`Meta media download error: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
