import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Administración independiente del portal de Nexus: tabla admin_users, separada
 * por completo de los usuarios de los tenants. Migra a los SUPERADMIN actuales
 * (que vivían dentro de un tenant cliente) a esta tabla y los retira (soft
 * delete) de users, para que ningún cliente tenga un administrador del SaaS.
 */
export class AdminUsers1791300000000 implements MigrationInterface {
  name = 'AdminUsers1791300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "admin_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar(200) NOT NULL,
        "password_hash" varchar(200) NOT NULL,
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMP,
        "login_attempts" int NOT NULL DEFAULT 0,
        "blocked_until" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_admin_users" PRIMARY KEY ("id")
      )
    `);
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_admin_users_email" ON "admin_users" ("email")`,
    );

    // Copia a los SUPERADMIN actuales (uno por correo) a admin_users.
    await q.query(`
      INSERT INTO "admin_users" (email, password_hash, first_name, last_name, is_active)
      SELECT DISTINCT ON (u.email)
             u.email, u.password_hash, u.first_name, u.last_name, u.is_active
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'SUPERADMIN'
      WHERE u.deleted_at IS NULL
      ORDER BY u.email, u.created_at ASC
      ON CONFLICT (email) DO NOTHING
    `);

    // Retira a esos SUPERADMIN de la tabla de usuarios de tenants.
    await q.query(`
      UPDATE users SET deleted_at = now()
      WHERE deleted_at IS NULL
        AND id IN (SELECT user_id FROM user_roles WHERE role = 'SUPERADMIN')
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "admin_users"`);
  }
}
