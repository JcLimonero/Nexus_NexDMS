import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Garantía del proveedor capturada al momento de la compra: se registra por
 * renglón de la orden de compra (meses + nota) y, al recibir la mercancía, se
 * copia a la relación parte↔proveedor (part_suppliers) para que quede visible
 * en el detalle de la refacción.
 */
export class GarantiaEnOrdenCompra1790800000000 implements MigrationInterface {
  name = 'GarantiaEnOrdenCompra1790800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "warranty_months" int`,
    );
    await q.query(
      `ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "warranty_note" varchar(300)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "purchase_order_items" DROP COLUMN "warranty_note"`,
    );
    await q.query(
      `ALTER TABLE "purchase_order_items" DROP COLUMN "warranty_months"`,
    );
  }
}
