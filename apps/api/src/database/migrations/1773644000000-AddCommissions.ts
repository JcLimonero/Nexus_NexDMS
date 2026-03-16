import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissions1773644000000 implements MigrationInterface {
  name = 'AddCommissions1773644000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "commission_periods_type_enum" AS ENUM (
        'BIWEEKLY', 'MONTHLY'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "commission_periods_status_enum" AS ENUM (
        'OPEN', 'UNDER_REVIEW', 'APPROVED', 'PAID'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "commission_details_status_enum" AS ENUM (
        'PENDING', 'APPROVED', 'REJECTED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "commission_periods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "period_date" date NOT NULL,
        "type" "commission_periods_type_enum" NOT NULL,
        "status" "commission_periods_status_enum" NOT NULL,
        "approver_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commission_periods" PRIMARY KEY ("id"),
        CONSTRAINT "FK_commission_periods_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_commission_periods_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_commission_periods_approver" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_commission_periods_tenant_id" ON "commission_periods" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commission_periods_branch_id" ON "commission_periods" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commission_periods_status" ON "commission_periods" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commission_periods_period_date" ON "commission_periods" ("period_date")`,
    );

    await queryRunner.query(`
      CREATE TABLE "commission_details" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "period_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "reference_id" uuid NOT NULL,
        "reference_type" varchar(50) NOT NULL,
        "concept" text NOT NULL,
        "base_amount" decimal(12,2) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "status" "commission_details_status_enum" NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commission_details" PRIMARY KEY ("id"),
        CONSTRAINT "FK_commission_details_period" FOREIGN KEY ("period_id") REFERENCES "commission_periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_commission_details_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_commission_details_period_id" ON "commission_details" ("period_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commission_details_user_id" ON "commission_details" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_commission_details_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_commission_details_period_id"`,
    );
    await queryRunner.query(`DROP TABLE "commission_details"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_commission_periods_period_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_commission_periods_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_commission_periods_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_commission_periods_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "commission_periods"`);

    await queryRunner.query(`DROP TYPE "commission_details_status_enum"`);
    await queryRunner.query(`DROP TYPE "commission_periods_status_enum"`);
    await queryRunner.query(`DROP TYPE "commission_periods_type_enum"`);
  }
}
