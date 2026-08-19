import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSortOrderFromCatalogs1773649200000
  implements MigrationInterface
{
  name = 'RemoveSortOrderFromCatalogs1773649200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_brands" DROP COLUMN IF EXISTS "sort_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_types" DROP COLUMN IF EXISTS "sort_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "combustion_types" DROP COLUMN IF EXISTS "sort_order"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_brands" ADD "sort_order" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_types" ADD "sort_order" smallint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "combustion_types" ADD "sort_order" smallint NOT NULL DEFAULT 0`,
    );
  }
}
