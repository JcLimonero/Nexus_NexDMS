import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * R15 — Especialidad del mecánico (etiqueta: hojalatero, pintor, general…).
 * R6 configurable — Límite de crédito por cliente y reglas de "salir con
 * adeudo" por tenant (tope de días de la fecha promesa, revisión de crédito).
 */
export class EspecialidadYCredito1789400000000 implements MigrationInterface {
  name = 'EspecialidadYCredito1789400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" ADD COLUMN "specialty" varchar(100)`);
    await q.query(
      `ALTER TABLE "clients" ADD COLUMN "credit_limit" numeric(12,2)`,
    );
    await q.query(`ALTER TABLE "tenants" ADD COLUMN "credit_config" jsonb`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "tenants" DROP COLUMN "credit_config"`);
    await q.query(`ALTER TABLE "clients" DROP COLUMN "credit_limit"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN "specialty"`);
  }
}
