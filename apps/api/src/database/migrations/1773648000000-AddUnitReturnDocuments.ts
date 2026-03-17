import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitReturnDocuments1773648000000 implements MigrationInterface {
  name = 'AddUnitReturnDocuments1773648000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."unit_return_documents_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "unit_return_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "unit_return_id" uuid NOT NULL,
        "document_type" character varying(50) NOT NULL,
        "name" character varying(200) NOT NULL,
        "storage_key" character varying(500) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "size_bytes" integer NOT NULL DEFAULT 0,
        "status" "public"."unit_return_documents_status_enum" NOT NULL DEFAULT 'PENDING',
        "validated_at" TIMESTAMP,
        "validated_by" uuid,
        "rejection_reason" character varying(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unit_return_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_unit_return_documents_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_unit_return_documents_unit_return" FOREIGN KEY ("unit_return_id") REFERENCES "unit_returns"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_unit_return_documents_validated_by" FOREIGN KEY ("validated_by") REFERENCES "users"("id") ON DELETE SET NULL
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_return_documents_tenant_id" ON "unit_return_documents" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_return_documents_unit_return_id" ON "unit_return_documents" ("unit_return_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_return_documents_document_type" ON "unit_return_documents" ("document_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_return_documents_status" ON "unit_return_documents" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_return_documents_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_return_documents_document_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_return_documents_unit_return_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_return_documents_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "unit_return_documents"`);
    await queryRunner.query(
      `DROP TYPE "public"."unit_return_documents_status_enum"`,
    );
  }
}
