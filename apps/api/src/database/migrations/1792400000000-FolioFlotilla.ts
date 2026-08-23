import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El número de convenio de flotilla pasa de ser manual a un código legible
 * autogenerado (`PREFIJO + FL + consecutivo`). Reescribe los existentes por
 * antigüedad, siembra el contador y deja índice único por empresa.
 */
export class FolioFlotilla1792400000000 implements MigrationInterface {
  name = 'FolioFlotilla1792400000000';

  public async up(q: QueryRunner): Promise<void> {
    const existe = (
      (await q.query(`SELECT to_regclass('public."fleet_agreements"') AS reg`)) as {
        reg: string | null;
      }[]
    )[0]?.reg;
    if (!existe) return;

    await q.query(`
      WITH numerados AS (
        SELECT id, tenant_id,
          ROW_NUMBER() OVER (
            PARTITION BY tenant_id ORDER BY created_at, id
          ) AS rn
        FROM "fleet_agreements"
      )
      UPDATE "fleet_agreements" e
      SET "agreement_number" = t.code_prefix || 'FL' || LPAD(n.rn::text, 8, '0')
      FROM numerados n
      JOIN "tenants" t ON t.id = n.tenant_id
      WHERE e.id = n.id AND t.code_prefix IS NOT NULL`);

    await q.query(`
      INSERT INTO "document_code_seq" (tenant_id, object_code, last_value)
      SELECT tenant_id, 'FL', COUNT(*)
      FROM "fleet_agreements" GROUP BY tenant_id
      ON CONFLICT (tenant_id, object_code) DO UPDATE
        SET last_value = GREATEST(document_code_seq.last_value, EXCLUDED.last_value)`);

    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_fleet_agreements_agreement_number" ON "fleet_agreements" ("tenant_id", "agreement_number") WHERE "agreement_number" IS NOT NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DROP INDEX IF EXISTS "UQ_fleet_agreements_agreement_number"`,
    );
    await q.query(`DELETE FROM "document_code_seq" WHERE object_code = 'FL'`);
  }
}
