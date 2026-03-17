import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequireGlobalModelIdForCatalogUnits1773650100000
  implements MigrationInterface
{
  name = 'RequireGlobalModelIdForCatalogUnits1773650100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const nullCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM catalog_units WHERE global_model_id IS NULL`,
    );
    const count = parseInt(nullCount[0]?.count ?? '0', 10);
    if (count > 0) {
      const brandRow = await queryRunner.query(
        `SELECT id FROM global_brands WHERE LOWER(name) = 'sin clasificar' LIMIT 1`,
      );
      let brandId: string;
      if (brandRow.length === 0) {
        const insertBrand = await queryRunner.query(
          `INSERT INTO global_brands (id, name, is_active, created_at, updated_at)
           VALUES (uuid_generate_v4(), 'Sin clasificar', true, now(), now())
           RETURNING id`,
        );
        brandId = insertBrand[0].id;
      } else {
        brandId = brandRow[0].id;
      }

      const vtRow = await queryRunner.query(
        `SELECT id FROM vehicle_types WHERE LOWER(code) = 'car' LIMIT 1`,
      );
      const fallbackVt = await queryRunner.query(
        `SELECT id FROM vehicle_types LIMIT 1`,
      );
      const vehicleTypeId = vtRow[0]?.id ?? fallbackVt[0]?.id;
      if (!vehicleTypeId) {
        throw new Error(
          'No hay vehicle_types. Ejecuta migraciones previas o crea tipos de vehículo.',
        );
      }

      const existingLegacy = await queryRunner.query(
        `SELECT id FROM global_models 
         WHERE brand_id = $1 AND model = 'Legacy' AND version = 'N/A' AND year = 1900 
         LIMIT 1`,
        [brandId],
      );
      let legacyModelId: string;
      if (existingLegacy.length === 0) {
        const insertModel = await queryRunner.query(
          `INSERT INTO global_models (id, brand_id, vehicle_type_id, model, version, year, is_active, created_at)
           VALUES (uuid_generate_v4(), $1, $2, 'Legacy', 'N/A', 1900, true, now())
           RETURNING id`,
          [brandId, vehicleTypeId],
        );
        legacyModelId = insertModel[0].id;
      } else {
        legacyModelId = existingLegacy[0].id;
      }

      await queryRunner.query(
        `UPDATE catalog_units SET global_model_id = $1 WHERE global_model_id IS NULL`,
        [legacyModelId],
      );
    }

    await queryRunner.query(
      `ALTER TABLE catalog_units ALTER COLUMN global_model_id SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE catalog_units ALTER COLUMN global_model_id DROP NOT NULL`,
    );
  }
}
