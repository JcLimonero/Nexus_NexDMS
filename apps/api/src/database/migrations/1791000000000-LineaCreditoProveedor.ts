import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Línea de crédito con proveedores: un monto límite por proveedor, y la marca
 * de "pagada" en la orden de compra para poder calcular cuánto de esa línea
 * está en uso (recibido y no pagado) y cuánto queda disponible.
 */
export class LineaCreditoProveedor1791000000000 implements MigrationInterface {
  name = 'LineaCreditoProveedor1791000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "credit_limit" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await q.query(
      `ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "purchase_orders" DROP COLUMN "paid_at"`);
    await q.query(`ALTER TABLE "suppliers" DROP COLUMN "credit_limit"`);
  }
}
