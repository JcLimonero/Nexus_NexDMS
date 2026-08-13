import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Recepción de unidades a servicio:
 * - Catálogo configurable de fotos por tipo de vehículo, con un set de
 *   fábrica (tenant_id NULL) que aplica mientras el cliente no defina el suyo.
 * - Marcadores de daños sobre cada foto (coordenadas relativas).
 * - Video opcional en la recepción.
 * - Cotización de recepción con aceptación del cliente por enlace público.
 */
export class RecepcionUnidades1786900000000 implements MigrationInterface {
  name = 'RecepcionUnidades1786900000000';

  public async up(q: QueryRunner): Promise<void> {
    // ── Catálogo de fotos ────────────────────────────
    await q.query(`
      CREATE TABLE "reception_photo_specs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "code" varchar(40) NOT NULL,
        "name" varchar(120) NOT NULL,
        "hint" varchar(300),
        "vehicle_types" text[],
        "required" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reception_photo_specs" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE INDEX "IDX_photo_specs_tenant" ON "reception_photo_specs" ("tenant_id", "is_active")`,
    );

    // Set de fábrica: tenant_id NULL. vehicle_types NULL = aplica a todos.
    const MOTO = `'{MOTORCYCLE}'`;
    const CUATRO = `'{CAR,SUV,MINIVAN,TRUCK,VAN,CARGO_VAN,BOX_TRUCK}'`;
    await q.query(`
      INSERT INTO "reception_photo_specs"
        ("tenant_id","code","name","hint","vehicle_types","required","sort_order")
      VALUES
        (NULL,'FRONT','Frente','Unidad completa de frente',NULL,true,10),
        (NULL,'REAR','Parte trasera','Unidad completa por detrás',NULL,true,20),
        (NULL,'LEFT_SIDE','Costado izquierdo','Lateral completo del lado izquierdo',NULL,true,30),
        (NULL,'RIGHT_SIDE','Costado derecho','Lateral completo del lado derecho',NULL,true,40),
        (NULL,'DASHBOARD','Tablero','Que se lea el odómetro y el nivel de combustible',NULL,true,50),
        (NULL,'WHEELS','Llantas','Estado de las llantas',${MOTO},false,60),
        (NULL,'INTERIOR','Interior','Asientos y tablero desde la puerta',${CUATRO},true,60),
        (NULL,'TRUNK','Cajuela','Interior de la cajuela',${CUATRO},true,70),
        (NULL,'ENGINE','Motor','Compartimento del motor',${CUATRO},false,80)
    `);

    // ── Fotos: tipo de medio y a qué spec responden ──
    await q.query(
      `ALTER TABLE "reception_photos" ADD "media_type" varchar(10) NOT NULL DEFAULT 'PHOTO'`,
    );
    await q.query(
      `ALTER TABLE "reception_photos" ADD "spec_code" varchar(40)`,
    );

    // ── Marcadores de daños sobre la foto ────────────
    await q.query(`
      CREATE TABLE "reception_photo_marks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reception_photo_id" uuid NOT NULL,
        "mark_type" varchar(30) NOT NULL,
        "note" varchar(300),
        "x" numeric(5,4) NOT NULL,
        "y" numeric(5,4) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reception_photo_marks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_marks_photo" FOREIGN KEY ("reception_photo_id")
          REFERENCES "reception_photos"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX "IDX_marks_photo" ON "reception_photo_marks" ("reception_photo_id")`,
    );

    // ── Aceptación de la cotización por el cliente ───
    await q.query(
      `ALTER TABLE "quotations" ADD "client_token" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "IDX_quotations_client_token" ON "quotations" ("client_token")`,
    );
    await q.query(
      `ALTER TABLE "quotations" ADD "client_responded_at" TIMESTAMP`,
    );
    await q.query(
      `ALTER TABLE "quotations" ADD "client_response_note" text`,
    );

    // Cotización que nace de la recepción de la orden
    await q.query(
      `ALTER TABLE "service_orders" ADD "reception_quotation_id" uuid`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "service_orders" DROP COLUMN "reception_quotation_id"`,
    );
    await q.query(`ALTER TABLE "quotations" DROP COLUMN "client_response_note"`);
    await q.query(`ALTER TABLE "quotations" DROP COLUMN "client_responded_at"`);
    await q.query(`DROP INDEX "IDX_quotations_client_token"`);
    await q.query(`ALTER TABLE "quotations" DROP COLUMN "client_token"`);
    await q.query(`DROP TABLE "reception_photo_marks"`);
    await q.query(`ALTER TABLE "reception_photos" DROP COLUMN "spec_code"`);
    await q.query(`ALTER TABLE "reception_photos" DROP COLUMN "media_type"`);
    await q.query(`DROP TABLE "reception_photo_specs"`);
  }
}
