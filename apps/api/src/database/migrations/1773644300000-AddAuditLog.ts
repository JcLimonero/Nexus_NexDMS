import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLog1773644300000 implements MigrationInterface {
  name = 'AddAuditLog1773644300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "audit_logs_action_enum" AS ENUM (
        'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
        'APPROVE', 'CANCEL'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "user_id" uuid,
        "action" "audit_logs_action_enum" NOT NULL,
        "table" varchar(100) NOT NULL,
        "record_id" uuid,
        "payload_before" jsonb,
        "payload_after" jsonb,
        "ip" varchar(50),
        "user_agent" varchar(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_tenant_id" ON "audit_logs" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_user_id" ON "audit_logs" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_table" ON "audit_logs" ("table")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_table"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_tenant_id"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);

    await queryRunner.query(`DROP TYPE "audit_logs_action_enum"`);
  }
}
