import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Plantillas de documentos editables por el cliente (HTML de un editor de texto
 * enriquecido). Genérica por `template_key` para reutilizarse en varios
 * documentos (contrato de compraventa, términos, cartas…), una por empresa.
 */
export class DocumentTemplates1792700000000 implements MigrationInterface {
  name = 'DocumentTemplates1792700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "document_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "template_key" varchar(60) NOT NULL,
        "html" text NOT NULL DEFAULT '',
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_templates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_document_templates_tenant_key" UNIQUE ("tenant_id", "template_key")
      )`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "document_templates"`);
  }
}
