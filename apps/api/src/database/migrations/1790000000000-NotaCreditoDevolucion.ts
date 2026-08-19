import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enlaza una devolución de refacción con su CFDI: el de la venta original
 * (cfdi_id) y el de la nota de crédito emitida (nota_credito_cfdi_id).
 */
export class NotaCreditoDevolucion1790000000000 implements MigrationInterface {
  name = 'NotaCreditoDevolucion1790000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "part_returns" ADD COLUMN "cfdi_id" uuid`);
    await q.query(
      `ALTER TABLE "part_returns" ADD COLUMN "nota_credito_cfdi_id" uuid`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "part_returns" DROP COLUMN "nota_credito_cfdi_id"`,
    );
    await q.query(`ALTER TABLE "part_returns" DROP COLUMN "cfdi_id"`);
  }
}
