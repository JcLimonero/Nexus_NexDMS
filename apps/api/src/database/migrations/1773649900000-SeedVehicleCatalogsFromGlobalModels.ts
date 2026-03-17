import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedVehicleCatalogsFromGlobalModels1773649900000
  implements MigrationInterface
{
  name = 'SeedVehicleCatalogsFromGlobalModels1773649900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Populate vehicle_models from distinct (brand_id, model) in global_models
    await queryRunner.query(`
      INSERT INTO "vehicle_models" ("id", "brand_id", "name")
      SELECT uuid_generate_v4(), gm.brand_id, gm.model
      FROM (
        SELECT DISTINCT brand_id, TRIM(model) AS model
        FROM global_models
        WHERE model IS NOT NULL AND TRIM(model) != ''
      ) gm
      ON CONFLICT ("brand_id", "name") DO NOTHING
    `);

    // 2. Populate vehicle_versions from distinct (brand_id, model, year, version) in global_models
    await queryRunner.query(`
      INSERT INTO "vehicle_versions" ("id", "brand_id", "model_id", "year", "name")
      SELECT uuid_generate_v4(), gm.brand_id, vm.id, gm.year, gm.version
      FROM (
        SELECT DISTINCT brand_id, TRIM(model) AS model, year, TRIM(version) AS version
        FROM global_models
        WHERE model IS NOT NULL AND TRIM(model) != ''
          AND version IS NOT NULL AND TRIM(version) != ''
      ) gm
      INNER JOIN vehicle_models vm ON vm.brand_id = gm.brand_id AND LOWER(vm.name) = LOWER(gm.model)
      ON CONFLICT ("brand_id", "model_id", "year", "name") DO NOTHING
    `);

    // 3. Populate vehicle_colors (EXTERIOR) from catalog_units with global_model_id
    await queryRunner.query(`
      INSERT INTO "vehicle_colors" ("id", "brand_id", "model_id", "version_id", "name", "color_type")
      SELECT uuid_generate_v4(), gm.brand_id, vm.id, vv.id, TRIM(cu.color), 'EXTERIOR'
      FROM catalog_units cu
      INNER JOIN global_models gm ON gm.id = cu.global_model_id
      INNER JOIN vehicle_models vm ON vm.brand_id = gm.brand_id AND LOWER(vm.name) = LOWER(TRIM(gm.model))
      INNER JOIN vehicle_versions vv ON vv.brand_id = gm.brand_id AND vv.model_id = vm.id AND vv.year = gm.year AND LOWER(vv.name) = LOWER(TRIM(gm.version))
      WHERE cu.color IS NOT NULL AND TRIM(cu.color) != ''
        AND (cu.deleted_at IS NULL OR cu.deleted_at > now())
      ON CONFLICT ("brand_id", "model_id", "version_id", "name", "color_type") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Clear seeded data - we can't easily reverse, so just truncate
    await queryRunner.query(`DELETE FROM "vehicle_colors"`);
    await queryRunner.query(`DELETE FROM "vehicle_versions"`);
    await queryRunner.query(`DELETE FROM "vehicle_models"`);
  }
}
