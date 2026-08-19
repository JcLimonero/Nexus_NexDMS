import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * R2 — Vale de compra ligado a la orden de servicio.
 *
 * Un egreso de caja (vale) puede ligarse a la orden para la que se compró la
 * refacción: así se sabe para qué auto salió el dinero y a quién se le cobra.
 */
export class ValeCompraEnCaja1789300000000 implements MigrationInterface {
  name = 'ValeCompraEnCaja1789300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "cash_movements" ADD COLUMN "service_order_id" uuid`,
    );
    await q.query(
      `CREATE INDEX "IDX_cash_movements_service_order" ON "cash_movements" ("service_order_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "IDX_cash_movements_service_order"`);
    await q.query(
      `ALTER TABLE "cash_movements" DROP COLUMN "service_order_id"`,
    );
  }
}
