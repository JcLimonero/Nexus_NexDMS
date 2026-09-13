import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Evidencia (foto/video) de las reclamaciones de garantía: sustenta la decisión
 * de autorizar, rechazar o resolver. El archivo vive en el almacenamiento; aquí
 * quedan su llave y metadatos.
 */
export class WarrantyEvidence1792800000000 implements MigrationInterface {
  name = 'WarrantyEvidence1792800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "warranty_evidence" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "warranty_id" uuid NOT NULL,
        "kind" varchar(10) NOT NULL,
        "storage_key" varchar(500) NOT NULL,
        "content_type" varchar(120),
        "file_name" varchar(300),
        "size_bytes" bigint,
        "caption" varchar(300),
        "uploaded_by_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_warranty_evidence" PRIMARY KEY ("id"),
        CONSTRAINT "FK_warranty_evidence_warranty" FOREIGN KEY ("warranty_id")
          REFERENCES "warranties" ("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_warranty_evidence_tenant" ON "warranty_evidence" ("tenant_id")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_warranty_evidence_warranty" ON "warranty_evidence" ("warranty_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "warranty_evidence"`);
  }
}
