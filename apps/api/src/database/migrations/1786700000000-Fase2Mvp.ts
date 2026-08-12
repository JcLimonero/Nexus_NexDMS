import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 2 MVP:
 * - CxC (receivables) y CxP (payables) con pagos parciales
 * - Leads y actividades (CRM ligero)
 * - Seminuevos: tomas/avalúos de compra a particular
 * - service_flow (jsonb) en tenants: transiciones de taller configurables
 */
export class Fase2Mvp1786700000000 implements MigrationInterface {
  name = 'Fase2Mvp1786700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "receivables" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid,
        "client_id" uuid,
        "reference_type" varchar(50),
        "reference_id" uuid,
        "concept" varchar(300) NOT NULL,
        "total" numeric(12,2) NOT NULL,
        "paid_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "due_date" date,
        "status" varchar(20) NOT NULL DEFAULT 'OPEN',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_receivables" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE INDEX "IDX_receivables_tenant" ON "receivables" ("tenant_id", "status")`,
    );
    await q.query(`
      CREATE TABLE "receivable_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "receivable_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "method" varchar(30) NOT NULL DEFAULT 'CASH',
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_receivable_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recv_pay" FOREIGN KEY ("receivable_id")
          REFERENCES "receivables"("id") ON DELETE CASCADE
      )`);

    await q.query(`
      CREATE TABLE "payables" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid,
        "supplier_id" uuid,
        "beneficiary_name" varchar(300),
        "reference_type" varchar(50),
        "reference_id" uuid,
        "concept" varchar(300) NOT NULL,
        "total" numeric(12,2) NOT NULL,
        "paid_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "due_date" date,
        "status" varchar(20) NOT NULL DEFAULT 'OPEN',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payables" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE INDEX "IDX_payables_tenant" ON "payables" ("tenant_id", "status")`,
    );
    await q.query(`
      CREATE TABLE "payable_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "payable_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "method" varchar(30) NOT NULL DEFAULT 'CASH',
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payable_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pay_pay" FOREIGN KEY ("payable_id")
          REFERENCES "payables"("id") ON DELETE CASCADE
      )`);

    await q.query(`
      CREATE TABLE "leads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid,
        "name" varchar(200) NOT NULL,
        "phone" varchar(20),
        "email" varchar(300),
        "source" varchar(30) NOT NULL DEFAULT 'OTRO',
        "interest" text,
        "status" varchar(20) NOT NULL DEFAULT 'NEW',
        "assigned_to" uuid,
        "client_id" uuid,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leads" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE INDEX "IDX_leads_tenant" ON "leads" ("tenant_id", "status")`,
    );
    await q.query(`
      CREATE TABLE "lead_activities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lead_id" uuid NOT NULL,
        "user_id" uuid,
        "type" varchar(20) NOT NULL DEFAULT 'NOTE',
        "notes" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lead_activities" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lead_act" FOREIGN KEY ("lead_id")
          REFERENCES "leads"("id") ON DELETE CASCADE
      )`);

    await q.query(`
      CREATE TABLE "used_unit_intakes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid,
        "seller_name" varchar(200) NOT NULL,
        "seller_phone" varchar(20),
        "brand" varchar(100) NOT NULL,
        "model" varchar(100) NOT NULL,
        "year" int,
        "plate" varchar(20),
        "vin" varchar(50),
        "km" int,
        "asking_price" numeric(12,2),
        "appraised_value" numeric(12,2),
        "offered_value" numeric(12,2),
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "notes" text,
        "catalog_unit_id" uuid,
        "payable_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_used_unit_intakes" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE INDEX "IDX_used_intakes_tenant" ON "used_unit_intakes" ("tenant_id", "status")`,
    );

    await q.query(`ALTER TABLE "tenants" ADD "service_flow" jsonb`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "tenants" DROP COLUMN "service_flow"`);
    await q.query(`DROP TABLE "used_unit_intakes"`);
    await q.query(`DROP TABLE "lead_activities"`);
    await q.query(`DROP TABLE "leads"`);
    await q.query(`DROP TABLE "payable_payments"`);
    await q.query(`DROP TABLE "payables"`);
    await q.query(`DROP TABLE "receivable_payments"`);
    await q.query(`DROP TABLE "receivables"`);
  }
}
