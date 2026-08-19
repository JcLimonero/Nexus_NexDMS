import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * R1 v2 — El presupuesto se arma por trabajos, y cada trabajo agrupa sus
 * refacciones. Un ítem "trabajo" es la línea padre (mano de obra, urgencia,
 * nota, fotos); sus refacciones son ítems hijos que apuntan al trabajo. El
 * cliente autoriza por trabajo; al borrar el trabajo caen sus refacciones.
 */
export class PresupuestoTrabajosRefacciones1789200000000
  implements MigrationInterface
{
  name = 'PresupuestoTrabajosRefacciones1789200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "quotation_items" ADD COLUMN "parent_item_id" uuid`,
    );
    await q.query(
      `ALTER TABLE "quotation_items" ADD CONSTRAINT "FK_quotation_items_parent" FOREIGN KEY ("parent_item_id") REFERENCES "quotation_items"("id") ON DELETE CASCADE`,
    );
    await q.query(
      `CREATE INDEX "IDX_quotation_items_parent" ON "quotation_items" ("parent_item_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "IDX_quotation_items_parent"`);
    await q.query(
      `ALTER TABLE "quotation_items" DROP CONSTRAINT "FK_quotation_items_parent"`,
    );
    await q.query(
      `ALTER TABLE "quotation_items" DROP COLUMN "parent_item_id"`,
    );
  }
}
