import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Administración del SaaS: planes con precio, módulos contratados aparte,
 * ficha del cliente e historial de cobros.
 *
 * Hasta ahora el portal solo sabía quién existe. Para operarlo como negocio
 * hace falta saber además cuánto paga cada quien, por qué concepto y si está
 * al corriente.
 *
 * El plan sigue siendo el enum `tenants.plan`: se le cuelga el precio en una
 * tabla aparte en vez de convertirlo en llave foránea, porque ese enum también
 * gobierna qué módulos entran en cada nivel y cambiarlo obligaría a tocar el
 * registro de módulos y las reglas de licencia.
 */
export class AdministracionSaas1787700000000 implements MigrationInterface {
  name = 'AdministracionSaas1787700000000';

  public async up(q: QueryRunner): Promise<void> {
    // ── Precio de cada plan ──────────────────────────────────
    await q.query(`
      CREATE TABLE "saas_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" varchar(20) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text,
        "monthly_price" numeric(12,2) NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'MXN',
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saas_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_saas_plans_key" UNIQUE ("key")
      )`);

    // ── Precio de un módulo contratado fuera del plan ────────
    await q.query(`
      CREATE TABLE "saas_module_prices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "module_key" varchar(50) NOT NULL,
        "monthly_price" numeric(12,2) NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'MXN',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saas_module_prices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_saas_module_prices_key" UNIQUE ("module_key")
      )`);

    // ── Ficha comercial del cliente ──────────────────────────
    await q.query(`
      ALTER TABLE "tenants"
        ADD "contact_name" varchar(200),
        ADD "contact_email" varchar(200),
        ADD "contact_phone" varchar(30),
        ADD "rfc" varchar(13),
        ADD "billing_email" varchar(200),
        ADD "address" varchar(400),
        ADD "notes" text,
        ADD "subscription_start" date,
        ADD "billing_day" int,
        ADD "extra_modules" jsonb`);

    // ── Cobros del SaaS ──────────────────────────────────────
    await q.query(`
      CREATE TABLE "saas_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "period" varchar(7) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'MXN',
        "status" varchar(20) NOT NULL DEFAULT 'PENDIENTE',
        "due_date" date,
        "paid_at" TIMESTAMP,
        "method" varchar(30),
        "reference" varchar(100),
        "concept" varchar(300),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saas_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_saas_payments_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_saas_payments_periodo" UNIQUE ("tenant_id", "period")
      )`);
    await q.query(
      `CREATE INDEX "IDX_saas_payments_tenant" ON "saas_payments" ("tenant_id", "period")`,
    );

    await this.seed(q);
  }

  /** Los tres niveles que ya existían, con un precio de partida editable. */
  private async seed(q: QueryRunner): Promise<void> {
    const planes: [string, string, string, number, number][] = [
      ['BASIC', 'Básico', 'Operación esencial: clientes, taller y caja.', 2500, 1],
      ['PRO', 'Pro', 'Suma inventarios, compras, almacén y finanzas.', 5900, 2],
      [
        'ENTERPRISE',
        'Empresarial',
        'Todo el sistema, con cumplimiento y reportes.',
        11900,
        3,
      ],
    ];
    for (const [key, name, description, precio, orden] of planes) {
      await q.query(
        `INSERT INTO "saas_plans" ("key","name","description","monthly_price","sort_order")
         VALUES ($1, $2, $3, $4, $5)`,
        [key, name, description, precio, orden],
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "saas_payments"`);
    await q.query(`
      ALTER TABLE "tenants"
        DROP COLUMN "extra_modules",
        DROP COLUMN "billing_day",
        DROP COLUMN "subscription_start",
        DROP COLUMN "notes",
        DROP COLUMN "address",
        DROP COLUMN "billing_email",
        DROP COLUMN "rfc",
        DROP COLUMN "contact_phone",
        DROP COLUMN "contact_email",
        DROP COLUMN "contact_name"`);
    await q.query(`DROP TABLE "saas_module_prices"`);
    await q.query(`DROP TABLE "saas_plans"`);
  }
}
