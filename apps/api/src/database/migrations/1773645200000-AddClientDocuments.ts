import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientDocuments1773645200000 implements MigrationInterface {
  name = 'AddClientDocuments1773645200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "client_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "document_type" character varying(50) NOT NULL,
        "name" character varying(200) NOT NULL,
        "storage_key" character varying(500) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "size_bytes" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_client_documents_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_client_documents_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_documents_tenant_id" ON "client_documents" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_documents_client_id" ON "client_documents" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_documents_document_type" ON "client_documents" ("document_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_client_documents_document_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_client_documents_client_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_client_documents_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "client_documents"`);
  }
}
