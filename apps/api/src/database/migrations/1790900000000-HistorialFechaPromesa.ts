import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bitácora de cambios de la fecha prometida de entrega de una orden de
 * servicio: cada cambio guarda de→a, el motivo, quién y cuándo.
 */
export class HistorialFechaPromesa1790900000000 implements MigrationInterface {
  name = 'HistorialFechaPromesa1790900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "service_order_promise_changes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "service_order_id" uuid NOT NULL,
        "old_promised_at" TIMESTAMP,
        "new_promised_at" TIMESTAMP,
        "reason" text NOT NULL,
        "changed_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_order_promise_changes" PRIMARY KEY ("id")
      )
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sopc_service_order" ON "service_order_promise_changes" ("service_order_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DROP INDEX IF EXISTS "IDX_sopc_service_order"`,
    );
    await q.query(`DROP TABLE IF EXISTS "service_order_promise_changes"`);
  }
}
