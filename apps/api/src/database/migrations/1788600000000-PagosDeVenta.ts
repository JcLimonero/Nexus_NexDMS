import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registro de pagos de la venta de una unidad.
 *
 * Cada pago —apartado, enganche, parcial, liquidación— se anota con su forma
 * de pago y su comprobante. El comprobante es opcional al registrar (el dinero
 * entra antes de que el asesor tenga el recibo a la mano) pero la venta no se
 * cierra hasta que todos lo tengan.
 */
export class PagosDeVenta1788600000000 implements MigrationInterface {
  name = 'PagosDeVenta1788600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "unit_sale_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "unit_sale_id" uuid NOT NULL,
        "kind" varchar(20) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "method" varchar(20) NOT NULL,
        "reference" varchar(120),
        "paid_date" date NOT NULL,
        "notes" varchar(300),
        "receipt_storage_key" varchar(500),
        "receipt_name" varchar(200),
        "receipt_mime" varchar(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unit_sale_payments" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_usp_kind" CHECK ("kind" IN ('APARTADO','ENGANCHE','PARCIAL','LIQUIDACION')),
        CONSTRAINT "CHK_usp_method" CHECK ("method" IN ('CASH','TRANSFER','CARD','CHECK','OTHER')),
        CONSTRAINT "CHK_usp_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_usp_sale" FOREIGN KEY ("unit_sale_id")
          REFERENCES "unit_sales"("id") ON DELETE CASCADE
      )`);
    await q.query(
      `CREATE INDEX "IDX_usp_sale" ON "unit_sale_payments" ("unit_sale_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "unit_sale_payments"`);
  }
}
