import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Liga la venta a la orden de servicio que la originó. Al cobrar una OS se crea
 * una venta (`sale_type = SERVICE_ORDER`) para que el ingreso entre al corte de
 * caja; esta columna guarda de qué orden vino, para no cobrarla dos veces y para
 * rastrear el cobro desde la orden.
 */
export class SalesServiceOrderLink1792600000000 implements MigrationInterface {
  name = 'SalesServiceOrderLink1792600000000';

  public async up(q: QueryRunner): Promise<void> {
    const existe = (
      (await q.query(`SELECT to_regclass('public."sales"') AS reg`)) as {
        reg: string | null;
      }[]
    )[0]?.reg;
    if (!existe) return;

    await q.query(
      `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "service_order_id" uuid`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sales_service_order_id" ON "sales" ("service_order_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_sales_service_order_id"`);
    await q.query(
      `ALTER TABLE "sales" DROP COLUMN IF EXISTS "service_order_id"`,
    );
  }
}
