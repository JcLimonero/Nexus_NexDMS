import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceTypes1773646400000 implements MigrationInterface {
  name = 'AddServiceTypes1773646400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "service_types_category_enum" AS ENUM (
        'MAINTENANCE', 'REVISION', 'DIAGNOSIS', 'REPAIR', 'OTHER'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "service_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid,
        "code" varchar(50) NOT NULL,
        "name" varchar(200) NOT NULL,
        "description" text,
        "category" "service_types_category_enum" NOT NULL,
        "duration_min" integer NOT NULL DEFAULT 60,
        "requires_ramp" boolean NOT NULL DEFAULT false,
        "ramp_duration_min" integer,
        "schedulable_days" smallint[],
        "recurrence_km_interval" integer,
        "recurrence_months_interval" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_types" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_types_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_service_types_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_service_types_tenant_code_global" ON "service_types" ("tenant_id", "code") WHERE "branch_id" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_service_types_tenant_branch_code" ON "service_types" ("tenant_id", "branch_id", "code") WHERE "branch_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_types_tenant_id" ON "service_types" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_types_branch_id" ON "service_types" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_types_category" ON "service_types" ("category")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_service_types_category"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_types_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_types_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_service_types_tenant_branch_code"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_service_types_tenant_code_global"`,
    );
    await queryRunner.query(`DROP TABLE "service_types"`);
    await queryRunner.query(`DROP TYPE "service_types_category_enum"`);
  }
}
