import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Comisiones a mecánicos por reglas:
 * - Config por mecánico (usuario): periodo de pago (semanal/quincenal), % de
 *   comisión sobre la mano de obra y sueldo garantía por periodo.
 * - Por operación: se puede excluir de comisión o fijar una ganancia manual
 *   (override) que gana el mecánico en esa operación.
 * - Por tenant: tipos de cargo (charge_type) exentos de comisión.
 */
export class ComisionesMecanico1791400000000 implements MigrationInterface {
  name = 'ComisionesMecanico1791400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "commission_period" varchar(12)`,
    );
    await q.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "commission_percent" numeric(5,2) NOT NULL DEFAULT 0`,
    );
    await q.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "guaranteed_salary" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await q.query(
      `ALTER TABLE "service_order_operations" ADD COLUMN IF NOT EXISTS "no_commission" boolean NOT NULL DEFAULT false`,
    );
    await q.query(
      `ALTER TABLE "service_order_operations" ADD COLUMN IF NOT EXISTS "commission_override" numeric(12,2)`,
    );
    await q.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "commission_exempt_charge_types" jsonb`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "tenants" DROP COLUMN IF EXISTS "commission_exempt_charge_types"`,
    );
    await q.query(
      `ALTER TABLE "service_order_operations" DROP COLUMN IF EXISTS "commission_override"`,
    );
    await q.query(
      `ALTER TABLE "service_order_operations" DROP COLUMN IF EXISTS "no_commission"`,
    );
    await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "guaranteed_salary"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "commission_percent"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "commission_period"`);
  }
}
