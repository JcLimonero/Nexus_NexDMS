import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  MASTER_TENANT_ID,
  MASTER_TENANT_NAME,
  MASTER_TENANT_SLUG,
} from '../../common/tenancy/master-tenant.const';

/**
 * Tenant "maestro" centinela para los catálogos plantilla (Fase 1 del wizard de
 * alta). No es un cliente real: se marca `is_template`, queda inactivo y se
 * excluye de listados y cobro. Sus catálogos son las plantillas que el wizard
 * copiará a cada empresa nueva.
 */
export class TenantMaestroCatalogos1792500000000 implements MigrationInterface {
  name = 'TenantMaestroCatalogos1792500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "is_template" boolean NOT NULL DEFAULT false`,
    );
    await q.query(
      `INSERT INTO "tenants" (id, name, slug, code_prefix, plan, is_active, is_template)
       VALUES ($1, $2, $3, 'NXS', 'ENTERPRISE', false, true)
       ON CONFLICT (id) DO UPDATE SET is_template = true, is_active = false`,
      [MASTER_TENANT_ID, MASTER_TENANT_NAME, MASTER_TENANT_SLUG],
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DELETE FROM "tenants" WHERE id = $1`, [MASTER_TENANT_ID]);
    await q.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "is_template"`);
  }
}
