import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuperadminAuditLog1773644600000 implements MigrationInterface {
  name = 'AddSuperadminAuditLog1773644600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "superadmin_audit_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ejecutivo_email" varchar(300) NOT NULL,
        "accion" varchar(100) NOT NULL,
        "tenant_id" uuid,
        "sucursal_id" uuid,
        "detalle" jsonb,
        "ip" varchar(50),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_superadmin_audit_log" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_superadmin_audit_log_tenant_id" ON "superadmin_audit_log" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_superadmin_audit_log_accion" ON "superadmin_audit_log" ("accion")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_superadmin_audit_log_created_at" ON "superadmin_audit_log" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_superadmin_audit_log_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_superadmin_audit_log_accion"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_superadmin_audit_log_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "superadmin_audit_log"`);
  }
}
