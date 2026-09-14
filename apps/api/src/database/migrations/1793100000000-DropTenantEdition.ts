import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Elimina la columna `tenants.edition`. El concepto de "edición" (NexQS vs
 * Total One) se retiró de este repo: Total One vive ahora en su propio repo
 * y producto independiente. NexQS deja de manejar ediciones.
 */
export class DropTenantEdition1793100000000 implements MigrationInterface {
  name = 'DropTenantEdition1793100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "edition"`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "edition" varchar(20) NOT NULL DEFAULT 'nexqs'`,
    );
  }
}
