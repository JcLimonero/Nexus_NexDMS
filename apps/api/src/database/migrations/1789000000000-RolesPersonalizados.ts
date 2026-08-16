import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Roles a medida por cliente.
 *
 * Un perfil con nombre propio que agrupa roles base del sistema. Es aditivo:
 * quien lo tenga alcanza la unión de lo que esos roles base alcanzan, sin tocar
 * el control de acceso base ni inventar permisos nuevos.
 */
export class RolesPersonalizados1789000000000 implements MigrationInterface {
  name = 'RolesPersonalizados1789000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "custom_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "base_roles" jsonb NOT NULL DEFAULT '[]',
        "description" varchar(300),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_roles" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE INDEX "IDX_custom_roles_tenant" ON "custom_roles" ("tenant_id")`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "UQ_custom_roles_tenant_name" ON "custom_roles" ("tenant_id", lower("name"))`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "custom_roles"`);
  }
}
