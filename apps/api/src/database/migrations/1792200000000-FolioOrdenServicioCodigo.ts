import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cambia el folio de las órdenes de servicio al código legible por empresa
 * (`PREFIJO + OS + consecutivo`). Los folios ya emitidos (`OS-2026-0001`) se
 * dejan intactos —renombrarlos rompería PDFs y referencias—; solo se siembra
 * el contador genérico ('OS') con el total de órdenes existentes por empresa,
 * para que las nuevas continúen la numeración sin chocar.
 */
export class FolioOrdenServicioCodigo1792200000000
  implements MigrationInterface
{
  name = 'FolioOrdenServicioCodigo1792200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      INSERT INTO "document_code_seq" (tenant_id, object_code, last_value)
      SELECT tenant_id, 'OS', COUNT(*)
      FROM "service_orders" GROUP BY tenant_id
      ON CONFLICT (tenant_id, object_code) DO UPDATE
        SET last_value = GREATEST(document_code_seq.last_value, EXCLUDED.last_value)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DELETE FROM "document_code_seq" WHERE object_code = 'OS'`,
    );
  }
}
