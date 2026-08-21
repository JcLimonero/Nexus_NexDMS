import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Módulo de Hojalatería y Pintura (bodywork), separado del taller mecánico.
 *
 * - `bodywork_parts`: catálogo de piezas de carrocería (propio, no el inventario
 *   de refacciones). Se siembra un set de fábrica con tenant_id = NULL.
 * - `bodywork_orders`: recepción + orden de trabajo (flujo simple), con switch
 *   particular/aseguradora y datos del siniestro.
 * - `bodywork_items`: partidas por pieza (reparar/cambiar/pintar) con mano de
 *   obra, material y costo de pieza; autorización por línea.
 * - `bodywork_photos`: fotos del daño (por orden o por pieza).
 * - `bodywork_folio_seq`: folio consecutivo por tenant y año.
 */
export class Bodywork1791500000000 implements MigrationInterface {
  name = 'Bodywork1791500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "bodywork_parts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid,
        "code" varchar(40) NOT NULL,
        "name" varchar(120) NOT NULL,
        "zone" varchar(20) NOT NULL DEFAULT 'OTRO',
        "default_price" numeric(12,2) NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bodywork_parts" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bodywork_parts_tenant" ON "bodywork_parts" ("tenant_id")`,
    );

    await q.query(`
      CREATE TABLE IF NOT EXISTS "bodywork_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid,
        "folio" int NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'RECEIVED',
        "client_id" uuid,
        "client_name" varchar(200) NOT NULL,
        "client_phone" varchar(30),
        "vehicle_plate" varchar(20),
        "vehicle_brand" varchar(60),
        "vehicle_model" varchar(60),
        "vehicle_year" int,
        "vehicle_color" varchar(40),
        "vehicle_vin" varchar(40),
        "payment_type" varchar(12) NOT NULL DEFAULT 'PARTICULAR',
        "insurance_company" varchar(120),
        "policy_number" varchar(60),
        "claim_number" varchar(60),
        "deductible" numeric(12,2),
        "adjuster" varchar(120),
        "claim_date" date,
        "km_in" int,
        "fuel_level" varchar(20),
        "damage_description" text,
        "observations" text,
        "assigned_to" uuid,
        "labor_total" numeric(12,2) NOT NULL DEFAULT 0,
        "material_total" numeric(12,2) NOT NULL DEFAULT 0,
        "parts_total" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "received_at" TIMESTAMP,
        "delivered_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bodywork_orders" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bodywork_orders_tenant" ON "bodywork_orders" ("tenant_id")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bodywork_orders_status" ON "bodywork_orders" ("status")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bodywork_orders_created" ON "bodywork_orders" ("created_at")`,
    );

    await q.query(`
      CREATE TABLE IF NOT EXISTS "bodywork_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "bodywork_part_id" uuid,
        "part_name" varchar(120) NOT NULL,
        "operation" varchar(12) NOT NULL,
        "quantity" int NOT NULL DEFAULT 1,
        "labor_price" numeric(12,2) NOT NULL DEFAULT 0,
        "material_price" numeric(12,2) NOT NULL DEFAULT 0,
        "part_price" numeric(12,2) NOT NULL DEFAULT 0,
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "status" varchar(12) NOT NULL DEFAULT 'PENDING',
        "note" text,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bodywork_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bodywork_items_order" FOREIGN KEY ("order_id")
          REFERENCES "bodywork_orders"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bodywork_items_order" ON "bodywork_items" ("order_id")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bodywork_items_tenant" ON "bodywork_items" ("tenant_id")`,
    );

    await q.query(`
      CREATE TABLE IF NOT EXISTS "bodywork_photos" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "item_id" uuid,
        "storage_key" varchar(300) NOT NULL,
        "caption" varchar(200),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bodywork_photos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bodywork_photos_order" FOREIGN KEY ("order_id")
          REFERENCES "bodywork_orders"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bodywork_photos_order" ON "bodywork_photos" ("order_id")`,
    );

    await q.query(`
      CREATE TABLE IF NOT EXISTS "bodywork_folio_seq" (
        "tenant_id" uuid NOT NULL,
        "year" int NOT NULL,
        "last_value" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_bodywork_folio_seq" PRIMARY KEY ("tenant_id", "year")
      )`);

    // Set de fábrica (tenant_id NULL): piezas de carrocería de auto comunes.
    await q.query(`
      INSERT INTO "bodywork_parts" ("tenant_id","code","name","zone","sort_order")
      VALUES
        (NULL,'COFRE','Cofre','FRENTE',10),
        (NULL,'FACIA_DEL','Facia delantera','FRENTE',20),
        (NULL,'PARRILLA','Parrilla','FRENTE',30),
        (NULL,'FARO_IZQ','Faro izquierdo','FRENTE',40),
        (NULL,'FARO_DER','Faro derecho','FRENTE',50),
        (NULL,'SALP_DEL_IZQ','Salpicadera delantera izquierda','LATERAL_IZQ',60),
        (NULL,'SALP_DEL_DER','Salpicadera delantera derecha','LATERAL_DER',70),
        (NULL,'PUERTA_DEL_IZQ','Puerta delantera izquierda','LATERAL_IZQ',80),
        (NULL,'PUERTA_TRAS_IZQ','Puerta trasera izquierda','LATERAL_IZQ',90),
        (NULL,'PUERTA_DEL_DER','Puerta delantera derecha','LATERAL_DER',100),
        (NULL,'PUERTA_TRAS_DER','Puerta trasera derecha','LATERAL_DER',110),
        (NULL,'ESPEJO_IZQ','Espejo izquierdo','LATERAL_IZQ',120),
        (NULL,'ESPEJO_DER','Espejo derecho','LATERAL_DER',130),
        (NULL,'ESTRIBO_IZQ','Estribo izquierdo','LATERAL_IZQ',140),
        (NULL,'ESTRIBO_DER','Estribo derecho','LATERAL_DER',150),
        (NULL,'TOLDO','Toldo','TECHO',160),
        (NULL,'FACIA_TRAS','Facia trasera','TRASERA',170),
        (NULL,'CAJUELA','Cajuela / tapa trasera','TRASERA',180),
        (NULL,'CALAVERA_IZQ','Calavera izquierda','TRASERA',190),
        (NULL,'CALAVERA_DER','Calavera derecha','TRASERA',200),
        (NULL,'PARABRISAS','Parabrisas','FRENTE',210),
        (NULL,'MEDALLON','Medallón (cristal trasero)','TRASERA',220),
        (NULL,'OTRA','Otra pieza','OTRO',900)
      ON CONFLICT DO NOTHING`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "bodywork_folio_seq"`);
    await q.query(`DROP TABLE IF EXISTS "bodywork_photos"`);
    await q.query(`DROP TABLE IF EXISTS "bodywork_items"`);
    await q.query(`DROP TABLE IF EXISTS "bodywork_orders"`);
    await q.query(`DROP TABLE IF EXISTS "bodywork_parts"`);
  }
}
