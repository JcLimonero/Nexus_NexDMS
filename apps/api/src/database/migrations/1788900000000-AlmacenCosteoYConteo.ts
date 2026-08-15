import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Almacén con costeo y conteo físico.
 *
 *  1. Costeo: la parte guardaba un solo "precio de compra" (el último). Ahora
 *     lleva costo promedio ponderado, que se recalcula en cada entrada de
 *     compra y sirve para valuar el inventario. El movimiento de compra guarda
 *     su costo unitario para rastrear cómo se formó ese promedio.
 *
 *  2. Conteo físico: toma de inventario. Se congelan las existencias del
 *     sistema en renglones y, al aplicar, se generan ajustes de entrada/salida
 *     que reconcilian contra lo contado.
 */
export class AlmacenCosteoYConteo1788900000000 implements MigrationInterface {
  name = 'AlmacenCosteoYConteo1788900000000';

  public async up(q: QueryRunner): Promise<void> {
    // Costo promedio ponderado; se arranca con el precio de compra actual.
    await q.query(`
      ALTER TABLE "parts"
        ADD "average_cost" numeric(12,2) NOT NULL DEFAULT 0`);
    await q.query(`UPDATE "parts" SET "average_cost" = "purchase_price"`);

    // Costo unitario de la entrada de compra, para la traza del costeo.
    await q.query(`
      ALTER TABLE "stock_movements"
        ADD "unit_cost" numeric(12,2)`);

    // Cabecera del conteo físico.
    await q.query(`
      CREATE TABLE "stock_counts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "folio" varchar(30) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'OPEN',
        "notes" text,
        "created_by_id" uuid NOT NULL,
        "applied_by_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "applied_at" TIMESTAMP,
        CONSTRAINT "PK_stock_counts" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sc_status" CHECK ("status" IN ('OPEN','APPLIED','CANCELLED'))
      )`);
    await q.query(
      `CREATE INDEX "IDX_sc_tenant" ON "stock_counts" ("tenant_id")`,
    );
    await q.query(
      `CREATE INDEX "IDX_sc_branch" ON "stock_counts" ("branch_id")`,
    );

    // Renglones: una parte por conteo, sistema vs contado.
    await q.query(`
      CREATE TABLE "stock_count_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "count_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "sku" varchar(100) NOT NULL,
        "name" varchar(300) NOT NULL,
        "system_qty" int NOT NULL,
        "counted_qty" int,
        "difference" int,
        CONSTRAINT "PK_stock_count_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_scl_count" FOREIGN KEY ("count_id")
          REFERENCES "stock_counts"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX "IDX_scl_count" ON "stock_count_lines" ("count_id")`,
    );
    await q.query(
      `CREATE INDEX "IDX_scl_part" ON "stock_count_lines" ("part_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "stock_count_lines"`);
    await q.query(`DROP TABLE "stock_counts"`);
    await q.query(`ALTER TABLE "stock_movements" DROP COLUMN "unit_cost"`);
    await q.query(`ALTER TABLE "parts" DROP COLUMN "average_cost"`);
  }
}
