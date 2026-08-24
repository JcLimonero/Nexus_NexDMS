import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SaasService } from '../../saas/saas.service';

/**
 * Resumen diario de clientes en mora del SaaS, por correo a compras de Nexus
 * (aviso de #36 vía EmailJS, sin SMTP). Solo se envía si hay algo que reportar.
 */
@Injectable()
export class SaasOverdueSummaryJob {
  private readonly logger = new Logger(SaasOverdueSummaryJob.name);

  constructor(private readonly saas: SaasService) {}

  @Cron('0 9 * * *', { timeZone: 'America/Mexico_City' })
  async handleCron(): Promise<void> {
    const r = await this.saas.enviarResumenMora();
    if (r.morosos === 0) return;
    this.logger.log(
      r.enviado
        ? `Resumen de mora enviado (${r.morosos} clientes).`
        : 'Resumen de mora no enviado (EmailJS sin configurar o error).',
    );
  }
}
