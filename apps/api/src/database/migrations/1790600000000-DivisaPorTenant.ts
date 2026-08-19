import { MigrationInterface, QueryRunner } from 'typeorm';

/** Divisa configurable por tenant (por defecto MXN). */
export class DivisaPorTenant1790600000000 implements MigrationInterface {
  name = 'DivisaPorTenant1790600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "tenants" ADD COLUMN "currency" varchar(3) NOT NULL DEFAULT 'MXN'`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "tenants" DROP COLUMN "currency"`);
  }
}
