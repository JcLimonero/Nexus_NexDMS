import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashSessions1773643100000 implements MigrationInterface {
  name = 'AddCashSessions1773643100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "cash_sessions_status_enum" AS ENUM (
        'OPEN', 'CLOSED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cash_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "opening_balance" decimal(12,2) NOT NULL,
        "closing_balance" decimal(12,2),
        "total_cash" decimal(12,2) NOT NULL DEFAULT 0,
        "total_card" decimal(12,2) NOT NULL DEFAULT 0,
        "total_transfer" decimal(12,2) NOT NULL DEFAULT 0,
        "total_sales" decimal(12,2) NOT NULL DEFAULT 0,
        "difference" decimal(12,2),
        "opened_at" TIMESTAMP NOT NULL,
        "closed_at" TIMESTAMP,
        "status" "cash_sessions_status_enum" NOT NULL,
        "closing_notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cash_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cash_sessions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_cash_sessions_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_cash_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_cash_sessions_tenant_id" ON "cash_sessions" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cash_sessions_branch_id" ON "cash_sessions" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cash_sessions_status" ON "cash_sessions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cash_sessions_opened_at" ON "cash_sessions" ("opened_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cash_sessions_opened_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_cash_sessions_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cash_sessions_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cash_sessions_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "cash_sessions"`);
    await queryRunner.query(`DROP TYPE "cash_sessions_status_enum"`);
  }
}
