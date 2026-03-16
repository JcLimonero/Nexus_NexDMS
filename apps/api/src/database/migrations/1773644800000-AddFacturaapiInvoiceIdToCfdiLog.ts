import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFacturaapiInvoiceIdToCfdiLog1773644800000 implements MigrationInterface {
  name = 'AddFacturaapiInvoiceIdToCfdiLog1773644800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cfdi_logs"
      ADD COLUMN "facturaapi_invoice_id" varchar(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cfdi_logs"
      DROP COLUMN "facturaapi_invoice_id"
    `);
  }
}
