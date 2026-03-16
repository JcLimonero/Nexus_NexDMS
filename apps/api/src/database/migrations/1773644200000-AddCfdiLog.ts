import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCfdiLog1773644200000 implements MigrationInterface {
  name = 'AddCfdiLog1773644200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "cfdi_logs_cfdi_type_enum" AS ENUM (
        'INCOME', 'EXPENSE', 'PAYMENT'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "cfdi_logs_status_enum" AS ENUM (
        'VALID', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cfdi_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "reference_id" uuid NOT NULL,
        "reference_type" varchar(50) NOT NULL,
        "cfdi_type" "cfdi_logs_cfdi_type_enum" NOT NULL,
        "sat_uuid" varchar(100) NOT NULL,
        "series" varchar(10) NOT NULL,
        "fiscal_folio" varchar(20) NOT NULL,
        "xml_key" varchar(500) NOT NULL,
        "pdf_key" varchar(500) NOT NULL,
        "total" decimal(12,2) NOT NULL,
        "status" "cfdi_logs_status_enum" NOT NULL,
        "cancellation_reason" varchar(200),
        "cancelled_by_id" uuid,
        "stamped_at" TIMESTAMP NOT NULL,
        "cancelled_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cfdi_logs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cfdi_logs_sat_uuid" UNIQUE ("sat_uuid"),
        CONSTRAINT "FK_cfdi_logs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_cfdi_logs_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_cfdi_logs_cancelled_by" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_cfdi_logs_tenant_id" ON "cfdi_logs" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cfdi_logs_branch_id" ON "cfdi_logs" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cfdi_logs_sat_uuid" ON "cfdi_logs" ("sat_uuid")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cfdi_logs_reference_type" ON "cfdi_logs" ("reference_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cfdi_logs_created_at" ON "cfdi_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_cfdi_logs_created_at"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cfdi_logs_reference_type"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_cfdi_logs_sat_uuid"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cfdi_logs_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cfdi_logs_tenant_id"`);
    await queryRunner.query(`DROP TABLE "cfdi_logs"`);

    await queryRunner.query(`DROP TYPE "cfdi_logs_status_enum"`);
    await queryRunner.query(`DROP TYPE "cfdi_logs_cfdi_type_enum"`);
  }
}
