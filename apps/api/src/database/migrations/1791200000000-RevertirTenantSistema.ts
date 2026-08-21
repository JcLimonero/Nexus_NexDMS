import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Revierte el tenant de sistema "Nexus": mueve a sus usuarios (el/los
 * SUPERADMIN) de vuelta al tenant cliente más antiguo y elimina el tenant de
 * sistema con su sucursal y razón social. Deja la columna is_system como está
 * (huérfana e inofensiva). Con guardas para ser idempotente y no fallar en
 * bases donde la separación nunca se aplicó.
 */
export class RevertirTenantSistema1791200000000 implements MigrationInterface {
  name = 'RevertirTenantSistema1791200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      DO $$
      DECLARE
        v_has boolean;
        v_nexus uuid;
        v_dest uuid;
        v_branch uuid;
      BEGIN
        SELECT EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tenants' AND column_name = 'is_system'
        ) INTO v_has;
        IF NOT v_has THEN RETURN; END IF;

        SELECT id INTO v_nexus FROM tenants WHERE is_system = true LIMIT 1;
        IF v_nexus IS NULL THEN RETURN; END IF;

        SELECT id INTO v_dest FROM tenants
          WHERE is_system = false ORDER BY created_at LIMIT 1;
        SELECT id INTO v_branch FROM branches
          WHERE tenant_id = v_dest ORDER BY created_at LIMIT 1;

        IF v_dest IS NOT NULL AND v_branch IS NOT NULL THEN
          UPDATE user_branches SET branch_id = v_branch, is_default = true
            WHERE user_id IN (SELECT id FROM users WHERE tenant_id = v_nexus);
          UPDATE users SET tenant_id = v_dest WHERE tenant_id = v_nexus;
        END IF;

        DELETE FROM branches WHERE tenant_id = v_nexus;
        DELETE FROM legal_entities WHERE tenant_id = v_nexus;
        DELETE FROM tenants WHERE id = v_nexus;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // No se recrea el tenant de sistema.
  }
}
