import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bitácora de cambios de estatus de cliente (suspender/reactivar) con motivo.
 * Suspender corta el acceso de todo un cliente; queda registrado quién, cuándo
 * y por qué.
 */
export class TenantStatusHistory1791600000000 implements MigrationInterface {
  name = 'TenantStatusHistory1791600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "tenant_status_changes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "previous_active" boolean NOT NULL,
        "new_active" boolean NOT NULL,
        "reason" text NOT NULL,
        "changed_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_status_changes" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tenant_status_changes_tenant" ON "tenant_status_changes" ("tenant_id", "created_at")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "tenant_status_changes"`);
  }
}
