import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import {
  WhatsappMediaService,
  type WhatsappMediaDownloadParams,
} from '../../whatsapp-core/whatsapp-media.service';
import { WhatsappMessage } from '../entities/whatsapp-message.entity';

/** Lo que trae el job: los datos para bajar el archivo, más a qué mensaje pegarle la key. */
export interface WhatsappMediaJobPayload extends WhatsappMediaDownloadParams {
  /** `id` de la fila en `whatsapp_messages` que ya se guardó en `recordInbound`. */
  messageId: string;
}

/**
 * Baja a segundo plano el adjunto de un mensaje entrante.
 *
 * Se encola desde `WhatsappConversationsService.recordInbound()` en vez de
 * bajar el archivo ahí mismo: Meta espera el 200 del webhook en pocos
 * segundos, y una foto grande (o una red lenta hacia Meta/B2) puede tardar
 * más que eso. El mensaje del cliente ya quedó guardado con su
 * `attachmentType` antes de que este job corra; aquí sólo se completa la
 * `attachmentKey` cuando la descarga sale bien.
 */
@Processor('whatsapp-media')
export class WhatsappMediaProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappMediaProcessor.name);

  constructor(
    @InjectRepository(WhatsappMessage)
    private readonly messageRepo: Repository<WhatsappMessage>,
    private readonly media: WhatsappMediaService,
  ) {
    super();
  }

  async process(job: Job<WhatsappMediaJobPayload>): Promise<void> {
    const key = await this.media.download(job.data);
    if (!key) {
      // Fallo permanente, ya logueado dentro de `download()`: el mensaje se
      // queda con `attachmentType` y sin `attachmentKey`. Perder la foto no
      // puede perder el mensaje.
      return;
    }

    await this.messageRepo.update(
      { id: job.data.messageId },
      { attachmentKey: key },
    );
    this.logger.debug(
      `Adjunto del mensaje ${job.data.messageId} guardado en ${key}`,
    );
  }
}
