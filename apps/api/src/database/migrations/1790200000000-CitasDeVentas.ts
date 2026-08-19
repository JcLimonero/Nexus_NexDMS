import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Citas de ventas (prueba de manejo, entrega, visita, seguimiento). Van en su
 * propia tabla para no interferir con las citas de taller (disponibilidad,
 * tablero, agenda), que tienen otra mecánica.
 */
export class CitasDeVentas1790200000000 implements MigrationInterface {
  name = 'CitasDeVentas1790200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "sales_appointments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "client_id" uuid,
        "client_name" varchar(200) NOT NULL,
        "client_phone" varchar(20),
        "seller_id" uuid,
        "catalog_unit_id" uuid,
        "unit_label" varchar(200),
        "purpose" varchar(20) NOT NULL DEFAULT 'TEST_DRIVE',
        "status" varchar(20) NOT NULL DEFAULT 'SCHEDULED',
        "scheduled_at" TIMESTAMP NOT NULL,
        "duration_min" int NOT NULL DEFAULT 60,
        "notes" text,
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales_appointments" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sap_purpose" CHECK ("purpose" IN ('TEST_DRIVE','DELIVERY','VISIT','FOLLOW_UP')),
        CONSTRAINT "CHK_sap_status" CHECK ("status" IN ('SCHEDULED','CONFIRMED','DONE','CANCELLED','NO_SHOW'))
      )`);
    await q.query(
      `CREATE INDEX "IDX_sap_tenant" ON "sales_appointments" ("tenant_id")`,
    );
    await q.query(
      `CREATE INDEX "IDX_sap_branch_sched" ON "sales_appointments" ("branch_id", "scheduled_at")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "sales_appointments"`);
  }
}
