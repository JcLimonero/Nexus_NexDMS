import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Conserva la recepción a quien ya la tenía.
 *
 * Hasta ahora la recepción de unidades vivía dentro del módulo `workshop`. Al
 * separarla en `reception`, los tenants con lista explícita de módulos se
 * habrían quedado sin ella sin que nadie lo pidiera: la licencia decía
 * "workshop" y la pantalla dejó de pertenecer a ese módulo.
 *
 * Los tenants sin lista explícita no necesitan nada: reciben todo lo que su
 * plan permite, y `reception` es de plan básico.
 */
export class RecepcionEnTenantsConTaller1787600000000
  implements MigrationInterface
{
  name = 'RecepcionEnTenantsConTaller1787600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      UPDATE "tenants"
         SET "enabled_modules" = "enabled_modules" || '["reception"]'::jsonb
       WHERE "enabled_modules" IS NOT NULL
         AND "enabled_modules" @> '["workshop"]'::jsonb
         AND NOT ("enabled_modules" @> '["reception"]'::jsonb)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      UPDATE "tenants"
         SET "enabled_modules" = "enabled_modules" - 'reception'
       WHERE "enabled_modules" IS NOT NULL`);
  }
}
