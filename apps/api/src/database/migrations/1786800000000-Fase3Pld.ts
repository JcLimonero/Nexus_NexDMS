import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 3 MVP — PLD/antilavado (LFPIORPI Art. 17 fracc. VIII):
 * registro de operaciones vulnerables sobre ventas de unidades y
 * configuración de umbrales UMA por tenant.
 */
export class Fase3Pld1786800000000 implements MigrationInterface {
  name = 'Fase3Pld1786800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "pld_operations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid,
        "client_id" uuid,
        "reference_type" varchar(50) NOT NULL DEFAULT 'UnitSale',
        "reference_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "uma_value" numeric(10,4) NOT NULL,
        "uma_amount" numeric(12,2) NOT NULL,
        "operation_date" date NOT NULL,
        "requires_identification" boolean NOT NULL DEFAULT false,
        "requires_notice" boolean NOT NULL DEFAULT false,
        "file_status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "notice_status" varchar(20) NOT NULL DEFAULT 'NOT_REQUIRED',
        "reported_at" TIMESTAMP,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pld_operations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pld_reference" UNIQUE ("reference_type", "reference_id")
      )`);
    await q.query(
      `CREATE INDEX "IDX_pld_tenant" ON "pld_operations" ("tenant_id", "operation_date")`,
    );
    await q.query(`ALTER TABLE "tenants" ADD "pld_config" jsonb`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "tenants" DROP COLUMN "pld_config"`);
    await q.query(`DROP TABLE "pld_operations"`);
  }
}
