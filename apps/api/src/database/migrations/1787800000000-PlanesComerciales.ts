import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Planes que se pueden crear, no solo tarifar.
 *
 * Hasta aquí un plan era el enum `tenants.plan`: tres niveles fijos con un
 * precio encima. Para poder armar paquetes ("Taller Plus", "Refacciones") hay
 * que separar dos cosas que hasta ahora eran la misma:
 *
 *   - el **nivel técnico** (`tier`), que es el enum de siempre y sigue siendo
 *     el tope de lo contratable y lo que leen el guard y las reglas de licencia;
 *   - el **paquete comercial**, que es esta tabla: nombre, precio y qué módulos
 *     entrega dentro de ese tope.
 *
 * Así se inventan planes sin tocar el enum ni la cadena de autorización: un
 * plan nuevo es una combinación de nivel y módulos, no un nivel nuevo.
 *
 * Los tres de origen quedan marcados como de sistema: su clave coincide con el
 * enum y borrarla dejaría tenants apuntando a un plan que no existe.
 */
export class PlanesComerciales1787800000000 implements MigrationInterface {
  name = 'PlanesComerciales1787800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "saas_plans"
        ADD "tier" varchar(20) NOT NULL DEFAULT 'BASIC',
        ADD "included_modules" jsonb,
        ADD "is_system" boolean NOT NULL DEFAULT false`);

    // Los tres de origen: su nivel es su propia clave y no se borran.
    await q.query(`
      UPDATE "saas_plans"
         SET "tier" = "key", "is_system" = true
       WHERE "key" IN ('BASIC', 'PRO', 'ENTERPRISE')`);

    await q.query(`
      ALTER TABLE "tenants"
        ADD "saas_plan_id" uuid,
        ADD CONSTRAINT "FK_tenants_saas_plan" FOREIGN KEY ("saas_plan_id")
          REFERENCES "saas_plans"("id") ON DELETE SET NULL`);

    // Cada cliente arranca en el plan que corresponde a su nivel actual, para
    // que la pantalla no muestre "sin plan" a quien lleva meses pagando.
    await q.query(`
      UPDATE "tenants" t
         SET "saas_plan_id" = p."id"
        FROM "saas_plans" p
       WHERE p."key" = t."plan"::text`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "FK_tenants_saas_plan", DROP COLUMN "saas_plan_id"`,
    );
    await q.query(`
      ALTER TABLE "saas_plans"
        DROP COLUMN "is_system",
        DROP COLUMN "included_modules",
        DROP COLUMN "tier"`);
  }
}
