import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAuditLogTableColumn1773644400000 implements MigrationInterface {
  name = 'RenameAuditLogTableColumn1773644400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_audit_logs_table"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "table" TO "table_name"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_table_name" ON "audit_logs" ("table_name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_audit_logs_table_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "table_name" TO "table"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_table" ON "audit_logs" ("table")`,
    );
  }
}
