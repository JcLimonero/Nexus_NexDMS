import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 2 · Parte 1 — Precios por cliente con vigencia.
 *
 * - `price_lists` gana ventana de vigencia (valid_from / valid_to). Fuera de
 *   ella la lista no aplica y el precio cae al comportamiento por enum.
 * - `price_list_items`: precio por parte dentro de una lista (la "lista de
 *   precios real"; antes solo existía un descuento global por lista).
 * - `clients.price_list_id`: la lista asignada al cliente. Al cotizar/vender
 *   para ese cliente, sus precios salen de esa lista si está vigente.
 */
export class PreciosPorClienteVigencia1789500000000
  implements MigrationInterface
{
  name = 'PreciosPorClienteVigencia1789500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "price_lists" ADD COLUMN "valid_from" date`);
    await q.query(`ALTER TABLE "price_lists" ADD COLUMN "valid_to" date`);

    await q.query(`
      CREATE TABLE "price_list_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "price_list_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_list_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pli_list" FOREIGN KEY ("price_list_id")
          REFERENCES "price_lists"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pli_part" FOREIGN KEY ("part_id")
          REFERENCES "parts"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_price_list_item" ON "price_list_items" ("price_list_id", "part_id")`,
    );
    await q.query(
      `CREATE INDEX "IDX_pli_tenant" ON "price_list_items" ("tenant_id")`,
    );

    await q.query(`ALTER TABLE "clients" ADD COLUMN "price_list_id" uuid`);
    await q.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_price_list"
        FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_clients_price_list"`,
    );
    await q.query(`ALTER TABLE "clients" DROP COLUMN "price_list_id"`);
    await q.query(`DROP TABLE "price_list_items"`);
    await q.query(`ALTER TABLE "price_lists" DROP COLUMN "valid_to"`);
    await q.query(`ALTER TABLE "price_lists" DROP COLUMN "valid_from"`);
  }
}
