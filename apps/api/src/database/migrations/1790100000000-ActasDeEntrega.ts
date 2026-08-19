import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Actas de entrega, bifurcadas por área:
 * - UNIT_SALE: entrega de una unidad vendida (factura, placas, contrato…).
 * - SERVICE: entrega de un vehículo del taller (trabajos, prueba, conformidad).
 * El checklist se guarda como jsonb para que cada tipo tenga sus puntos.
 */
export class ActasDeEntrega1790100000000 implements MigrationInterface {
  name = 'ActasDeEntrega1790100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "folio" varchar(30) NOT NULL,
        "kind" varchar(20) NOT NULL,
        "reference_type" varchar(40),
        "reference_id" uuid,
        "reference_label" varchar(120),
        "client_id" uuid,
        "checklist" jsonb NOT NULL DEFAULT '[]',
        "notes" varchar(500),
        "signature_key" varchar(500),
        "delivered_by" uuid,
        "delivered_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_delivery_kind" CHECK ("kind" IN ('UNIT_SALE','SERVICE'))
      )`);
    await q.query(
      `CREATE INDEX "IDX_delivery_tenant" ON "deliveries" ("tenant_id", "kind")`,
    );
    await q.query(
      `CREATE INDEX "IDX_delivery_branch" ON "deliveries" ("branch_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "deliveries"`);
  }
}
