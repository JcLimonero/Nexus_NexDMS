import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Código legible por empresa para TODOS los documentos de proceso.
 *
 * Por cada documento: se asegura la columna de folio, se REESCRIBEN todos los
 * folios existentes al esquema `PREFIJO + OBJETO + consecutivo(8)` (por orden de
 * antigüedad, por empresa), se siembra el contador genérico `document_code_seq`
 * con el total por empresa y se pone un índice único por empresa.
 *
 * Nota: los folios históricos con formato viejo (OS-2026-0001, COT-…, TK-…) se
 * renombran al nuevo formato, por decisión de negocio de uniformar todo.
 * El GUID sigue siendo la relación; el folio es solo lectura/búsqueda.
 */
export class CodigosProcesos1792300000000 implements MigrationInterface {
  name = 'CodigosProcesos1792300000000';

  private readonly docs = [
    { t: 'service_orders', obj: 'OS', col: 'folio' },
    { t: 'quotations', obj: 'COT', col: 'folio' },
    { t: 'sales', obj: 'VM', col: 'ticket_number' },
    { t: 'unit_sales', obj: 'VU', col: 'folio' },
    { t: 'purchase_orders', obj: 'OC', col: 'folio' },
    { t: 'warehouse_transfers', obj: 'TR', col: 'folio' },
    { t: 'part_returns', obj: 'DV', col: 'folio' },
    { t: 'deliveries', obj: 'EN', col: 'folio' },
    { t: 'stock_counts', obj: 'CF', col: 'folio' },
    { t: 'bodywork_orders', obj: 'HP', col: 'folio', fromInt: true },
    { t: 'unit_reservations', obj: 'AP', col: 'folio', add: true },
    { t: 'unit_returns', obj: 'RC', col: 'folio', add: true },
    { t: 'warranties', obj: 'GA', col: 'folio', add: true },
    { t: 'appointments', obj: 'CT', col: 'folio', add: true },
    { t: 'sales_appointments', obj: 'CV', col: 'folio', add: true },
    { t: 'purchase_requisitions', obj: 'RQ', col: 'folio', add: true },
    { t: 'cash_sessions', obj: 'CC', col: 'folio', add: true },
    { t: 'leads', obj: 'OP', col: 'folio', add: true },
  ];

  private async existe(q: QueryRunner, tabla: string): Promise<boolean> {
    const r = (await q.query(`SELECT to_regclass($1) AS reg`, [
      `public."${tabla}"`,
    ])) as { reg: string | null }[];
    return !!r[0]?.reg;
  }

  public async up(q: QueryRunner): Promise<void> {
    for (const d of this.docs) {
      if (!(await this.existe(q, d.t))) continue;

      if (d.fromInt) {
        // El folio de hojalatería era entero; pasa a código string.
        await q.query(
          `ALTER TABLE "${d.t}" ALTER COLUMN "${d.col}" TYPE varchar(24) USING "${d.col}"::text`,
        );
      }
      if (d.add) {
        await q.query(
          `ALTER TABLE "${d.t}" ADD COLUMN IF NOT EXISTS "${d.col}" varchar(24)`,
        );
      }

      // Reescribe TODOS los folios al nuevo esquema, por antigüedad y empresa.
      await q.query(`
        WITH numerados AS (
          SELECT id, tenant_id,
            ROW_NUMBER() OVER (
              PARTITION BY tenant_id ORDER BY created_at, id
            ) AS rn
          FROM "${d.t}"
        )
        UPDATE "${d.t}" e
        SET "${d.col}" = t.code_prefix || '${d.obj}' || LPAD(n.rn::text, 8, '0')
        FROM numerados n
        JOIN "tenants" t ON t.id = n.tenant_id
        WHERE e.id = n.id AND t.code_prefix IS NOT NULL`);

      // Siembra el contador con el total por empresa.
      await q.query(`
        INSERT INTO "document_code_seq" (tenant_id, object_code, last_value)
        SELECT tenant_id, '${d.obj}', COUNT(*)
        FROM "${d.t}" GROUP BY tenant_id
        ON CONFLICT (tenant_id, object_code) DO UPDATE
          SET last_value = GREATEST(document_code_seq.last_value, EXCLUDED.last_value)`);

      // Unicidad del folio por empresa.
      await q.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_${d.t}_${d.col}" ON "${d.t}" ("tenant_id", "${d.col}") WHERE "${d.col}" IS NOT NULL`,
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const d of this.docs) {
      if (!(await this.existe(q, d.t))) continue;
      await q.query(`DROP INDEX IF EXISTS "UQ_${d.t}_${d.col}"`);
      await q.query(
        `DELETE FROM "document_code_seq" WHERE object_code = '${d.obj}'`,
      );
      if (d.add) {
        await q.query(`ALTER TABLE "${d.t}" DROP COLUMN IF EXISTS "${d.col}"`);
      }
      // No se revierte el renombrado de folios (dato ya reescrito) ni el tipo
      // de hojalatería; sería una reconstrucción con pérdida.
    }
  }
}
