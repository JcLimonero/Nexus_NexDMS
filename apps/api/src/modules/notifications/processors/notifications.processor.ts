import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationLog } from '../entities/notification-log.entity';
import {
  NotificationChannelEnum,
  NotificationStatusEnum,
} from '../entities/notification-log.entity';
import { WhatsAppProvider } from '../providers/whatsapp.provider';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { EmailComposer } from '../../../common/email/email-composer.service';

export interface NotificationJobPayload {
  channel: NotificationChannelEnum;
  templateKey: string;
  referenceType: string;
  referenceId: string;
  recipient: string;
  tenantId: string;
  branchId?: string | null;
  templateParams?: Record<string, string>;
  subject?: string;
  html?: string;
  text?: string;
  attachments?: Array<{ filename: string; content: string }>;
}

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    private readonly whatsapp: WhatsAppProvider,
    private readonly email: EmailProvider,
    private readonly sms: SmsProvider,
    private readonly composer: EmailComposer,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const payload = job.data;
    const log = this.logRepo.create({
      tenantId: payload.tenantId,
      branchId: payload.branchId ?? null,
      channel: payload.channel,
      templateKey: payload.templateKey,
      referenceType: payload.referenceType,
      referenceId: payload.referenceId,
      recipient: payload.recipient,
      status: NotificationStatusEnum.PENDING,
    });
    await this.logRepo.save(log);

    try {
      if (payload.channel === NotificationChannelEnum.WHATSAPP) {
        await this.whatsapp.send({
          to: payload.recipient,
          templateKey: payload.templateKey,
          templateParams: payload.templateParams,
        });
      } else if (payload.channel === NotificationChannelEnum.EMAIL) {
        // El cuerpo del correo se envuelve en la plantilla con la marca del
        // concesionario, salvo que ya venga como documento completo.
        const raw =
          payload.html ?? (payload.text ? `<p>${payload.text}</p>` : '');
        const subject = payload.subject ?? payload.templateKey;
        const yaCompleto = raw.trim().toLowerCase().startsWith('<!doctype');
        const finalHtml = yaCompleto
          ? raw
          : await this.composer.brandedClient(
              payload.tenantId,
              subject,
              raw || '<p>Tienes una notificación de tu concesionario.</p>',
            );
        await this.email.send({
          to: payload.recipient,
          subject,
          html: finalHtml,
          attachments: payload.attachments?.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content, 'base64'),
          })),
        });
      } else if (payload.channel === NotificationChannelEnum.SMS) {
        await this.sms.send({
          to: payload.recipient,
          body:
            payload.text ?? payload.templateParams?.body ?? payload.templateKey,
        });
      }

      log.status = NotificationStatusEnum.SENT;
      log.sentAt = new Date();
      await this.logRepo.save(log);
    } catch (e) {
      log.status = NotificationStatusEnum.FAILED;
      log.errorMessage = e instanceof Error ? e.message : String(e);
      await this.logRepo.save(log);
      throw e;
    }
  }
}
