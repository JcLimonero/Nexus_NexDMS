import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Convenios de flotilla: una empresa con varias unidades y precios
 * preferenciales (lista o % en refacciones, % en mano de obra y en venta de
 * unidades). Las unidades adscritas al convenio se listan aparte.
 */
export class Fleets1791700000000 implements MigrationInterface {
  name = 'Fleets1791700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "fleet_agreements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "agreement_number" varchar(40) NOT NULL,
        "name" varchar(160) NOT NULL,
        "parts_price_list_id" uuid,
        "parts_discount_pct" numeric(5,2),
        "labor_discount_pct" numeric(5,2),
        "unit_sale_discount_pct" numeric(5,2),
        "valid_from" date,
        "valid_to" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fleet_agreements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fleet_agreements_client" FOREIGN KEY ("client_id")
          REFERENCES "clients"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fleet_agreements_tenant" ON "fleet_agreements" ("tenant_id")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fleet_agreements_client" ON "fleet_agreements" ("client_id")`,
    );
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_fleet_agreements_number" ON "fleet_agreements" ("tenant_id", "agreement_number")`,
    );

    await q.query(`
      CREATE TABLE IF NOT EXISTS "fleet_units" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "fleet_agreement_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "added_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fleet_units" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fleet_units_agreement" FOREIGN KEY ("fleet_agreement_id")
          REFERENCES "fleet_agreements"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_fleet_units_vehicle" FOREIGN KEY ("vehicle_id")
          REFERENCES "customer_vehicles"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fleet_units_agreement" ON "fleet_units" ("fleet_agreement_id")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fleet_units_vehicle" ON "fleet_units" ("vehicle_id")`,
    );
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_fleet_units_agreement_vehicle" ON "fleet_units" ("fleet_agreement_id", "vehicle_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "fleet_units"`);
    await q.query(`DROP TABLE IF EXISTS "fleet_agreements"`);
  }
}
