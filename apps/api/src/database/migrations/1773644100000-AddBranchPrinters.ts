import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchPrinters1773644100000 implements MigrationInterface {
  name = 'AddBranchPrinters1773644100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "branch_printers_type_enum" AS ENUM (
        'THERMAL_80MM', 'LASER', 'INKJET'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "branch_printers_usage_enum" AS ENUM (
        'TICKETS', 'DOCUMENTS', 'BOTH'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "branch_printers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "type" "branch_printers_type_enum" NOT NULL,
        "usage" "branch_printers_usage_enum" NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branch_printers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_branch_printers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_branch_printers_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_branch_printers_tenant_id" ON "branch_printers" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_branch_printers_branch_id" ON "branch_printers" ("branch_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_branch_printers_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_branch_printers_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "branch_printers"`);

    await queryRunner.query(`DROP TYPE "branch_printers_usage_enum"`);
    await queryRunner.query(`DROP TYPE "branch_printers_type_enum"`);
  }
}
