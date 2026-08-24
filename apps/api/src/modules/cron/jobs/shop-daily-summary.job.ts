import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { EmailjsService } from '../../../common/email/emailjs.service';
import { EmailComposer } from '../../../common/email/email-composer.service';

interface Fila {
  tenant_id: string;
  activas: number;
  espera_refacciones: number;
  listas: number;
  entregadas_hoy: number;
}

/**
 * Resumen diario del taller para la gerencia de cada concesionario: cuántas
 * órdenes tiene activas, cuántas esperan refacciones, cuántas están listas y
 * cuántas entregó hoy. Solo se envía a tenants con movimiento.
 */
@Injectable()
export class ShopDailySummaryJob {
  private readonly logger = new Logger(ShopDailySummaryJob.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly emailjs: EmailjsService,
    private readonly composer: EmailComposer,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'America/Mexico_City' })
  async handleCron(): Promise<void> {
    const filas = await this.dataSource.query<Fila[]>(`
      SELECT tenant_id,
        COUNT(*) FILTER (WHERE status NOT IN ('DELIVERED','CANCELLED')) AS activas,
        COUNT(*) FILTER (WHERE status = 'WAITING_PARTS') AS espera_refacciones,
        COUNT(*) FILTER (WHERE status = 'READY') AS listas,
        COUNT(*) FILTER (WHERE status = 'DELIVERED' AND delivered_at::date = CURRENT_DATE) AS entregadas_hoy
      FROM service_orders
      GROUP BY tenant_id
    `);
    const conMovimiento = filas.filter(
      (f) => Number(f.activas) > 0 || Number(f.entregadas_hoy) > 0,
    );
    if (!conMovimiento.length) return;

    for (const f of conMovimiento) {
      const gerentes = await this.dataSource.query<{ email: string }[]>(
        `SELECT DISTINCT u.email
         FROM users u JOIN user_roles r ON r.user_id = u.id
         WHERE u.tenant_id = $1 AND u.deleted_at IS NULL
           AND u.email IS NOT NULL AND r.role IN ('ADMIN','MANAGER')`,
        [f.tenant_id],
      );
      if (!gerentes.length) continue;
      const content =
        `<p>Así va el taller hoy:</p>` +
        `<ul style="line-height:1.9">` +
        `<li><strong>${f.activas}</strong> órdenes activas</li>` +
        `<li><strong>${f.espera_refacciones}</strong> esperando refacciones</li>` +
        `<li><strong>${f.listas}</strong> listas para entrega</li>` +
        `<li><strong>${f.entregadas_hoy}</strong> entregadas hoy</li>` +
        `</ul>`;
      const html = await this.composer.brandedClient(
        f.tenant_id,
        'Resumen del taller',
        content,
        'Operación',
      );
      for (const g of gerentes) {
        await this.emailjs.enviar({
          subject: 'Resumen diario del taller',
          html,
          to: g.email,
        });
      }
    }
    this.logger.log(`Resumen de taller enviado a ${conMovimiento.length} tenant(s).`);
  }
}
