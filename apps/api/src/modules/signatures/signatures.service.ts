import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import {
  DocumentSignature,
  SIGNATURE_KIND_LABELS,
  SignatureKindEnum,
  SignatureModeEnum,
} from './entities/document-signature.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { Client } from '../clients/entities/client.entity';
import { StorageService } from '../../common/storage/storage.service';

/** Orden en que se piden las firmas de una orden de servicio. */
const ORDEN_FIRMAS: SignatureKindEnum[] = [
  SignatureKindEnum.CLIENT_CONFORME,
  SignatureKindEnum.CLIENT_QUOTE,
  SignatureKindEnum.ADVISOR,
];

/**
 * Firma de la orden de servicio.
 *
 * Se admiten dos modos porque el taller real tiene los dos casos: el cliente
 * que está en el mostrador firma en la pantalla, y el que dejó la unidad y
 * se fue recibe un enlace y firma desde su teléfono. En ambos se guarda el
 * trazo, la fecha y la IP, que es lo que sostiene la firma si después se
 * discute el cobro.
 */
@Injectable()
export class SignaturesService {
  private readonly logger = new Logger(SignaturesService.name);

  constructor(
    @InjectRepository(DocumentSignature)
    private readonly sigRepo: Repository<DocumentSignature>,
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly storage: StorageService,
    private readonly events: EventEmitter2,
  ) {}

  /** Las tres firmas de la orden, con su estado. */
  async estado(user: UserPayload, serviceOrderId: string) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
    });
    if (!so) throw new NotFoundException('Orden no encontrada');

    const firmas = await this.sigRepo.find({ where: { serviceOrderId } });
    return ORDEN_FIRMAS.map((kind) => {
      const f = firmas.find((x) => x.kind === kind);
      return {
        kind,
        label: SIGNATURE_KIND_LABELS[kind],
        firmada: !!f?.signedAt,
        mode: f?.mode ?? null,
        signerName: f?.signerName ?? null,
        signedAt: f?.signedAt ?? null,
        imageKey: f?.imageKey ?? null,
        /** Presente solo si hay una firma remota pendiente. */
        token: f && !f.signedAt ? f.token : null,
      };
    });
  }

  /**
   * Firma presencial: el trazo llega ya hecho desde el pad de la pantalla,
   * como PNG en base64.
   */
  async firmarPresencial(
    user: UserPayload,
    serviceOrderId: string,
    dto: { kind: SignatureKindEnum; signerName?: string; dataUrl: string },
    ip?: string,
  ) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
    });
    if (!so) throw new NotFoundException('Orden no encontrada');

    const buffer = this.decodificarTrazo(dto.dataUrl);
    const key = `service-orders/${serviceOrderId}/firmas/${dto.kind}.png`;
    await this.storage.upload(buffer, key, 'image/png');

    return this.guardar(so, dto.kind, {
      mode: SignatureModeEnum.PRESENCIAL,
      signerName: dto.signerName ?? null,
      imageKey: key,
      signedAt: new Date(),
      signerIp: ip ?? null,
      token: null,
    });
  }

  /**
   * Firma remota: se genera el enlace y se le manda al cliente. La firma
   * todavía no existe; queda pendiente hasta que la haga.
   */
  async solicitarRemota(
    user: UserPayload,
    serviceOrderId: string,
    dto: { kind: SignatureKindEnum },
  ) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
      relations: ['owner'],
    });
    if (!so) throw new NotFoundException('Orden no encontrada');
    if (dto.kind === SignatureKindEnum.ADVISOR) {
      throw new BadRequestException(
        'La firma del asesor es presencial: no tiene sentido mandársela por enlace',
      );
    }

    const token = randomUUID();
    const firma = await this.guardar(so, dto.kind, {
      mode: SignatureModeEnum.REMOTA,
      signerName: null,
      imageKey: null,
      signedAt: null,
      signerIp: null,
      token,
      requestedAt: new Date(),
    });

    const cliente = await this.clientRepo.findOne({ where: { id: so.ownerId } });
    if (cliente?.phone) {
      this.events.emit('firma.solicitada', {
        serviceOrderId: so.id,
        folio: so.folio,
        kind: dto.kind,
        label: SIGNATURE_KIND_LABELS[dto.kind],
        token,
        tenantId: so.tenantId,
        branchId: so.branchId,
        client: { phone: cliente.phone, email: cliente.email ?? undefined },
      });
    } else {
      this.logger.warn(
        `Firma remota de ${so.folio} sin aviso: el cliente no tiene teléfono`,
      );
    }
    return firma;
  }

  /** Lo que ve el cliente al abrir el enlace, sin sesión. */
  async documentoPublico(token: string) {
    const firma = await this.sigRepo.findOne({ where: { token } });
    if (!firma) throw new NotFoundException('Enlace de firma no válido');
    if (firma.signedAt) {
      throw new BadRequestException('Este documento ya fue firmado');
    }
    const so = await this.soRepo.findOne({
      where: { id: firma.serviceOrderId },
      relations: ['vehicle', 'branch', 'owner'],
    });
    const v = so?.vehicle as unknown as Record<string, unknown> | undefined;
    return {
      kind: firma.kind,
      label: SIGNATURE_KIND_LABELS[firma.kind],
      folio: so?.folio ?? null,
      sucursal: so?.branch?.name ?? null,
      reportedFault: so?.reportedFault ?? null,
      vehiculo: v
        ? {
            marca: (v['make'] ?? v['brand'] ?? null) as string | null,
            modelo: (v['model'] ?? null) as string | null,
            placa: (v['plate'] ?? null) as string | null,
          }
        : null,
    };
  }

  /** El cliente firma desde el enlace. */
  async firmarRemota(
    token: string,
    dto: { signerName?: string; dataUrl: string },
    ip?: string,
  ) {
    const firma = await this.sigRepo.findOne({ where: { token } });
    if (!firma) throw new NotFoundException('Enlace de firma no válido');
    if (firma.signedAt) {
      throw new BadRequestException('Este documento ya fue firmado');
    }

    const buffer = this.decodificarTrazo(dto.dataUrl);
    const key = `service-orders/${firma.serviceOrderId}/firmas/${firma.kind}.png`;
    await this.storage.upload(buffer, key, 'image/png');

    await this.sigRepo.update(firma.id, {
      imageKey: key,
      signerName: dto.signerName?.trim() || null,
      signedAt: new Date(),
      signerIp: ip ?? null,
      // El token se quema al usarse: el enlace no debe servir dos veces.
      token: null,
    });
    return { ok: true };
  }

  /**
   * El trazo llega como data URL del canvas. Se valida el prefijo y el
   * tamaño: es una entrada de fuera y no debe confiarse a ciegas.
   */
  private decodificarTrazo(dataUrl: string): Buffer {
    const prefijo = 'data:image/png;base64,';
    if (!dataUrl?.startsWith(prefijo)) {
      throw new BadRequestException('La firma debe venir como PNG en base64');
    }
    const buffer = Buffer.from(dataUrl.slice(prefijo.length), 'base64');
    if (!buffer.length) throw new BadRequestException('La firma viene vacía');
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('La firma no puede pasar de 2 MB');
    }
    return buffer;
  }

  /** Alta o reemplazo de la firma; hay una sola por tipo y orden. */
  private async guardar(
    so: ServiceOrder,
    kind: SignatureKindEnum,
    datos: Partial<DocumentSignature>,
  ): Promise<DocumentSignature> {
    const existente = await this.sigRepo.findOne({
      where: { serviceOrderId: so.id, kind },
    });
    if (existente) {
      if (existente.signedAt) {
        throw new BadRequestException(
          `"${SIGNATURE_KIND_LABELS[kind]}" ya está firmada`,
        );
      }
      await this.sigRepo.update(existente.id, datos);
      return this.sigRepo.findOneOrFail({ where: { id: existente.id } });
    }
    return this.sigRepo.save(
      this.sigRepo.create({
        tenantId: so.tenantId,
        serviceOrderId: so.id,
        kind,
        ...datos,
      }),
    );
  }
}
