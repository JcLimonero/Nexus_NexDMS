import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

/**
 * Retención de tablas append-only que crecen sin límite (bitácora de
 * notificaciones y auditoría). Purga filas más viejas que la ventana
 * configurada. Es OPT-IN: si la ventana es 0 o no está definida, NO borra nada
 * —no se elimina historial sin que alguien lo pida explícitamente por env—.
 *
 * NOTA: `stock_movements` (kardex) no se purga aquí a propósito: es la
 * trazabilidad de inventario. Si crece demasiado, la vía correcta es
 * particionar por mes, no borrar.
 */
@Injectable()
export class DataRetentionJob {
  private readonly logger = new Logger(DataRetentionJob.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 3 * * 0', { timeZone: 'America/Mexico_City' }) // domingos 03:00
  async handleCron(): Promise<void> {
    await this.purgar('notification_logs', 'NOTIF_RETENTION_DAYS');
    await this.purgar('audit_logs', 'AUDIT_RETENTION_DAYS');
  }

  private async purgar(tabla: string, envKey: string): Promise<void> {
    const dias = parseInt(this.config.get<string>(envKey) ?? '0', 10);
    if (!Number.isFinite(dias) || dias <= 0) return; // desactivado
    try {
      const res: [unknown[], number] = await this.dataSource.query(
        `DELETE FROM "${tabla}" WHERE created_at < now() - interval '${dias} days'`,
      );
      const borradas = Array.isArray(res) ? res[1] : 0;
      this.logger.log(`Retención ${tabla}: ${borradas} filas > ${dias} días.`);
    } catch (e) {
      this.logger.warn(`Retención ${tabla} falló`, e as Error);
    }
  }
}
