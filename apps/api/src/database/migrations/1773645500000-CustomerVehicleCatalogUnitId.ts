import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerVehicleCatalogUnitId1773645500000 implements MigrationInterface {
  name = 'CustomerVehicleCatalogUnitId1773645500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" ADD "catalog_unit_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_vehicles_catalog_unit_id" ON "customer_vehicles" ("catalog_unit_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" ADD CONSTRAINT "FK_customer_vehicles_catalog_unit" FOREIGN KEY ("catalog_unit_id") REFERENCES "catalog_units"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" DROP CONSTRAINT "FK_customer_vehicles_catalog_unit"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_customer_vehicles_catalog_unit_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" DROP COLUMN "catalog_unit_id"`,
    );
  }
}
