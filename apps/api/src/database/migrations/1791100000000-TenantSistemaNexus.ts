import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Separa a los administradores de Nexus (SUPERADMIN) de los usuarios de los
 * clientes. Antes el super-admin vivía dentro de un tenant cliente y el login
 * sin slug buscaba en todos los tenants. Se crea un tenant de sistema "Nexus"
 * (is_system) y se mueven ahí los SUPERADMIN, dejando a cada cliente solo con
 * sus propios usuarios.
 */
export class TenantSistemaNexus1791100000000 implements MigrationInterface {
  name = 'TenantSistemaNexus1791100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "is_system" boolean NOT NULL DEFAULT false`,
    );

    await q.query(`
      DO $$
      DECLARE
        v_tenant uuid;
        v_legal uuid;
        v_branch uuid;
      BEGIN
        SELECT id INTO v_tenant FROM tenants WHERE is_system = true LIMIT 1;

        IF v_tenant IS NULL THEN
          INSERT INTO tenants (name, slug, plan, is_system, palette, currency, is_active)
          VALUES ('Nexus Q Tech', 'nexus', 'ENTERPRISE', true, 'nexus', 'MXN', true)
          RETURNING id INTO v_tenant;

          INSERT INTO legal_entities (tenant_id, name, type, is_active)
          VALUES (v_tenant, 'Nexus Q Tech', 'BOTH', true)
          RETURNING id INTO v_legal;

          INSERT INTO branches
            (tenant_id, legal_entity_id, name, slug, address, city, state, counter_phone, email, horario, is_primary, is_active)
          VALUES
            (v_tenant, v_legal, 'Nexus', 'nexus', 'N/A', 'N/A', 'N/A', 'N/A', 'admin@nexusqtech.com', '{}'::jsonb, true, true)
          RETURNING id INTO v_branch;
        ELSE
          SELECT id INTO v_branch FROM branches WHERE tenant_id = v_tenant ORDER BY created_at LIMIT 1;
        END IF;

        -- Mueve un SUPERADMIN por correo (el más antiguo) al tenant de sistema.
        UPDATE users SET tenant_id = v_tenant, scope = 'GLOBAL'
        WHERE id IN (
          SELECT id FROM (
            SELECT u.id,
                   ROW_NUMBER() OVER (PARTITION BY u.email ORDER BY u.created_at ASC) AS rn
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'SUPERADMIN'
            WHERE u.deleted_at IS NULL AND u.tenant_id <> v_tenant
          ) s WHERE s.rn = 1
        );

        -- Repunta las sucursales de los movidos a la sucursal del sistema.
        DELETE FROM user_branches WHERE user_id IN (SELECT id FROM users WHERE tenant_id = v_tenant);
        INSERT INTO user_branches (user_id, branch_id, is_default)
        SELECT id, v_branch, true FROM users WHERE tenant_id = v_tenant
        ON CONFLICT (user_id, branch_id) DO NOTHING;

        -- Elimina (soft) los SUPERADMIN duplicados que quedaron en tenants cliente.
        UPDATE users SET deleted_at = now()
        WHERE deleted_at IS NULL AND tenant_id <> v_tenant
          AND id IN (SELECT user_id FROM user_roles WHERE role = 'SUPERADMIN');
      END $$;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    // No se revierte el movimiento de usuarios; solo se quita la marca de sistema.
    await q.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "is_system"`);
  }
}
