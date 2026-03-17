import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInteriorColorAndColorIdsToCatalogUnits1773650000000
  implements MigrationInterface
{
  name = 'AddInteriorColorAndColorIdsToCatalogUnits1773650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalog_units" ADD "interior_color" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" ADD "exterior_color_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" ADD "interior_color_id" uuid`,
    );
    await queryRunner.query(`
      ALTER TABLE "catalog_units"
      ADD CONSTRAINT "FK_catalog_units_exterior_color"
      FOREIGN KEY ("exterior_color_id") REFERENCES "vehicle_colors"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "catalog_units"
      ADD CONSTRAINT "FK_catalog_units_interior_color"
      FOREIGN KEY ("interior_color_id") REFERENCES "vehicle_colors"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalog_units" DROP CONSTRAINT "FK_catalog_units_interior_color"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" DROP CONSTRAINT "FK_catalog_units_exterior_color"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" DROP COLUMN "interior_color_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" DROP COLUMN "exterior_color_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" DROP COLUMN "interior_color"`,
    );
  }
}
