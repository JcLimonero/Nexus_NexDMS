import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deja rastro de en qué se convirtió una cotización.
 *
 * Antes "convertir" solo cambiaba el estatus y no creaba nada; ahora crea la
 * venta o la orden de verdad, así que conviene guardar a qué apunta para poder
 * saltar de la cotización a lo que originó, y no volver a convertirla.
 */
export class CotizacionConvertida1788800000000 implements MigrationInterface {
  name = 'CotizacionConvertida1788800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "quotations"
        ADD "converted_to_type" varchar(20),
        ADD "converted_to_id" uuid`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "quotations"
        DROP COLUMN "converted_to_id",
        DROP COLUMN "converted_to_type"`);
  }
}
