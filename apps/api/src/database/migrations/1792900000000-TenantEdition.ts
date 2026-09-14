import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Edición del producto por tenant: 'total-one' (subconjunto DMS Lite) o 'nexqs'
 * (superset, default). Acota los módulos que el tenant puede tener activos.
 */
export class TenantEdition1792900000000 implements MigrationInterface {
  name = 'TenantEdition1792900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "edition" varchar(20) NOT NULL DEFAULT 'nexqs'`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "edition"`);
  }
}
