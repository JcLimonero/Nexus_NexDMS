import { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogUnitServiceFields1773645400000 implements MigrationInterface {
  name = 'CatalogUnitServiceFields1773645400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalog_units" ADD "last_service_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" ADD "last_service_mileage" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" ADD "next_service_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" ADD "next_service_mileage" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalog_units" DROP COLUMN "next_service_mileage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" DROP COLUMN "next_service_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" DROP COLUMN "last_service_mileage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" DROP COLUMN "last_service_date"`,
    );
  }
}
