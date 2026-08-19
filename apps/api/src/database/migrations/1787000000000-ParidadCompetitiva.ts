import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Paridad competitiva (Narobial / Grupo Quiter).
 *
 * Cubre los huecos detectados al comparar la demo del competidor contra
 * NexDMS. Va todo en una migración porque las piezas se referencian entre
 * sí: una operación puede nacer de un hallazgo o de un kit, y el fichaje
 * apunta a la operación.
 *
 *  1. `service_order_operations` — el trabajo se desglosa en operaciones con
 *     código de mano de obra, tiempo baremo y tipo de cargo. Antes la O.R.
 *     era una bolsa única, así que no se podía imputar garantía ni interno,
 *     ni medir productividad contra un tiempo esperado.
 *  2. `service_order_times.operation_id` — el fichaje pasa a ser por
 *     operación, no por orden completa.
 *  3. `service_kits` / `service_kit_items` — paquetes de mantenimiento con su
 *     mano de obra y sus refacciones, para cotizar de un golpe.
 *  4. `document_signatures` — firma de la orden, presencial o remota.
 *  5. `portal_users` — sesión propia del cliente (código de un solo uso por
 *     WhatsApp; no se guardan contraseñas).
 *  6. `portal_messages` — conversación cliente ↔ asesor.
 *  7. Hallazgos: criticidad, cotización asociada y estado, para cerrar el
 *     ciclo trabajo adicional → autorización.
 *  8. Vehículo de sustitución en la O.R.
 */
export class ParidadCompetitiva1787000000000 implements MigrationInterface {
  name = 'ParidadCompetitiva1787000000000';

  public async up(q: QueryRunner): Promise<void> {
    // ── 1. Operaciones de la orden ──────────────────────────────
    await q.query(`
      CREATE TABLE "service_order_operations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "code" varchar(50),
        "description" varchar(500) NOT NULL,
        "standard_minutes" int NOT NULL DEFAULT 0,
        "labor_price" numeric(12,2) NOT NULL DEFAULT 0,
        "charge_type" varchar(20) NOT NULL DEFAULT 'CLIENT',
        "charge_account" varchar(50),
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "source" varchar(20) NOT NULL DEFAULT 'RECEPTION',
        "finding_id" uuid,
        "kit_id" uuid,
        "mechanic_id" uuid,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_order_operations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_soo_service_order" FOREIGN KEY ("service_order_id")
          REFERENCES "service_orders"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX "IDX_soo_order" ON "service_order_operations" ("service_order_id", "sort_order")`,
    );

    // ── 2. El fichaje apunta a la operación ─────────────────────
    await q.query(`ALTER TABLE "service_order_times" ADD "operation_id" uuid`);
    await q.query(
      `ALTER TABLE "service_order_times" ADD CONSTRAINT "FK_sot_operation"
       FOREIGN KEY ("operation_id") REFERENCES "service_order_operations"("id") ON DELETE SET NULL`,
    );

    // ── 3. Kits de servicio ─────────────────────────────────────
    // tenant_id NULL = kit de fábrica, visible para todos los tenants.
    await q.query(`
      CREATE TABLE "service_kits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "code" varchar(50) NOT NULL,
        "kit_type" varchar(50) NOT NULL DEFAULT 'GENERICO',
        "name" varchar(300) NOT NULL,
        "description" text,
        "vehicle_types" text[],
        "labor_minutes" int NOT NULL DEFAULT 0,
        "labor_price" numeric(12,2) NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_kits" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_service_kits_code" ON "service_kits" ("tenant_id", "code")`,
    );
    await q.query(`
      CREATE TABLE "service_kit_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "kit_id" uuid NOT NULL,
        "part_id" uuid,
        "sku" varchar(100),
        "description" varchar(300) NOT NULL,
        "quantity" int NOT NULL DEFAULT 1,
        "unit_price" numeric(12,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_service_kit_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ski_kit" FOREIGN KEY ("kit_id")
          REFERENCES "service_kits"("id") ON DELETE CASCADE
      )`);

    // ── 4. Firmas del documento ─────────────────────────────────
    await q.query(`
      CREATE TABLE "document_signatures" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "service_order_id" uuid NOT NULL,
        "kind" varchar(30) NOT NULL,
        "mode" varchar(20) NOT NULL DEFAULT 'PRESENCIAL',
        "signer_name" varchar(200),
        "image_key" varchar(500),
        "token" varchar(64),
        "requested_at" TIMESTAMP,
        "signed_at" TIMESTAMP,
        "signer_ip" varchar(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_signatures" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_document_signatures_token" UNIQUE ("token"),
        CONSTRAINT "FK_ds_service_order" FOREIGN KEY ("service_order_id")
          REFERENCES "service_orders"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_ds_order_kind" ON "document_signatures" ("service_order_id", "kind")`,
    );

    // ── 5. Acceso del cliente al portal ─────────────────────────
    // Sin contraseñas: código de un solo uso por WhatsApp. Se guarda
    // hasheado y con caducidad, igual que trataríamos una credencial.
    await q.query(`
      CREATE TABLE "portal_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "phone" varchar(30) NOT NULL,
        "email" varchar(200),
        "otp_hash" varchar(200),
        "otp_expires_at" TIMESTAMP,
        "otp_attempts" int NOT NULL DEFAULT 0,
        "last_login_at" TIMESTAMP,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_portal_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pu_client" FOREIGN KEY ("client_id")
          REFERENCES "clients"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_portal_users_phone" ON "portal_users" ("tenant_id", "phone")`,
    );

    // ── 6. Conversación cliente ↔ asesor ────────────────────────
    await q.query(`
      CREATE TABLE "portal_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "service_order_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "sender" varchar(10) NOT NULL,
        "user_id" uuid,
        "body" text NOT NULL,
        "attachment_key" varchar(500),
        "read_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_portal_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pm_service_order" FOREIGN KEY ("service_order_id")
          REFERENCES "service_orders"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX "IDX_pm_order" ON "portal_messages" ("service_order_id", "created_at")`,
    );

    // ── 7. Hallazgos: criticidad, cotización y estado ───────────
    await q.query(`
      ALTER TABLE "service_order_findings"
        ADD "criticality" varchar(10) NOT NULL DEFAULT 'MEDIA',
        ADD "estimated_minutes" int NOT NULL DEFAULT 0,
        ADD "estimated_amount" numeric(12,2) NOT NULL DEFAULT 0,
        ADD "quotation_id" uuid,
        ADD "status" varchar(20) NOT NULL DEFAULT 'PENDIENTE'`);

    // ── 8. Vehículo de sustitución ──────────────────────────────
    await q.query(`
      ALTER TABLE "service_orders"
        ADD "substitute_unit_id" uuid,
        ADD "substitute_delivered_at" TIMESTAMP,
        ADD "substitute_returned_at" TIMESTAMP`);

    await this.seedKits(q);
  }

  /**
   * Kits de fábrica (tenant_id NULL). Son los servicios que cualquier taller
   * de motos y autos cotiza a diario; el tenant puede añadir los suyos.
   */
  private async seedKits(q: QueryRunner): Promise<void> {
    const kits: [string, string, string, string[] | null, number, number][] = [
      // code, name, kit_type, vehicle_types, labor_minutes, labor_price
      ['MTTO-5K', 'Servicio de mantenimiento 5 mil km', 'TALLER', ['MOTORCYCLE'], 60, 450],
      ['MTTO-10K', 'Servicio de mantenimiento 10 mil km', 'TALLER', ['MOTORCYCLE'], 90, 650],
      ['MTTO-20K', 'Servicio mayor 20 mil km', 'TALLER', ['MOTORCYCLE'], 150, 1100],
      ['AFIN-MAY', 'Afinación mayor', 'TALLER', null, 180, 1400],
      ['FRENOS-D', 'Cambio de balatas delanteras', 'GENERICO', null, 60, 500],
      ['LAVADO', 'Lavado y detallado', 'TALLER', null, 45, 250],
      ['DIAG', 'Diagnóstico con escáner', 'GENERICO', null, 60, 600],
    ];
    for (const [code, name, type, vTypes, min, price] of kits) {
      await q.query(
        `INSERT INTO "service_kits"
           ("tenant_id","code","kit_type","name","vehicle_types","labor_minutes","labor_price")
         VALUES (NULL, $1, $2, $3, $4, $5, $6)`,
        [code, type, name, vTypes, min, price],
      );
    }
    // Refacciones típicas de cada kit, por descripción: al cotizar se
    // intentan casar contra el catálogo del tenant por SKU.
    const items: [string, string, string, number, number][] = [
      ['MTTO-5K', 'ACE-10W40', 'Aceite 10W-40 (litro)', 1, 180],
      ['MTTO-5K', 'FIL-ACE', 'Filtro de aceite', 1, 120],
      ['MTTO-10K', 'ACE-10W40', 'Aceite 10W-40 (litro)', 1, 180],
      ['MTTO-10K', 'FIL-ACE', 'Filtro de aceite', 1, 120],
      ['MTTO-10K', 'BUJIA', 'Bujía', 1, 95],
      ['MTTO-20K', 'ACE-10W40', 'Aceite 10W-40 (litro)', 1, 180],
      ['MTTO-20K', 'FIL-ACE', 'Filtro de aceite', 1, 120],
      ['MTTO-20K', 'BUJIA', 'Bujía', 1, 95],
      ['MTTO-20K', 'FIL-AIRE', 'Filtro de aire', 1, 240],
      ['AFIN-MAY', 'BUJIA', 'Bujía', 1, 95],
      ['AFIN-MAY', 'FIL-AIRE', 'Filtro de aire', 1, 240],
      ['AFIN-MAY', 'FIL-GAS', 'Filtro de gasolina', 1, 180],
      ['FRENOS-D', 'BAL-DEL', 'Juego de balatas delanteras', 1, 620],
    ];
    for (const [kitCode, sku, description, qty, price] of items) {
      await q.query(
        `INSERT INTO "service_kit_items" ("kit_id","sku","description","quantity","unit_price")
         SELECT id, $2, $3, $4, $5 FROM "service_kits"
         WHERE "code" = $1 AND "tenant_id" IS NULL`,
        [kitCode, sku, description, qty, price],
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "service_orders"
      DROP COLUMN "substitute_returned_at",
      DROP COLUMN "substitute_delivered_at",
      DROP COLUMN "substitute_unit_id"`);
    await q.query(`ALTER TABLE "service_order_findings"
      DROP COLUMN "status",
      DROP COLUMN "quotation_id",
      DROP COLUMN "estimated_amount",
      DROP COLUMN "estimated_minutes",
      DROP COLUMN "criticality"`);
    await q.query(`DROP TABLE "portal_messages"`);
    await q.query(`DROP TABLE "portal_users"`);
    await q.query(`DROP TABLE "document_signatures"`);
    await q.query(`DROP TABLE "service_kit_items"`);
    await q.query(`DROP TABLE "service_kits"`);
    await q.query(
      `ALTER TABLE "service_order_times" DROP CONSTRAINT "FK_sot_operation"`,
    );
    await q.query(
      `ALTER TABLE "service_order_times" DROP COLUMN "operation_id"`,
    );
    await q.query(`DROP TABLE "service_order_operations"`);
  }
}
