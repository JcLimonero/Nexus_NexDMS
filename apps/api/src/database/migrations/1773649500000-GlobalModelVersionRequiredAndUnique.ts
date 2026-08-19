import { MigrationInterface, QueryRunner } from 'typeorm';

export class GlobalModelVersionRequiredAndUnique1773649500000
  implements MigrationInterface
{
  name = 'GlobalModelVersionRequiredAndUnique1773649500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Set default for existing NULL versions
    await queryRunner.query(`
      UPDATE "global_models"
      SET "version" = 'Base'
      WHERE "version" IS NULL OR TRIM("version") = ''
    `);

    // 2. Make version NOT NULL
    await queryRunner.query(`
      ALTER TABLE "global_models"
      ALTER COLUMN "version" SET NOT NULL
    `);

    // 3. Create unique index on (brand_id, model, version, year)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_global_models_brand_model_version_year"
      ON "global_models" ("brand_id", "model", "version", "year")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_global_models_brand_model_version_year"`,
    );
    await queryRunner.query(`
      ALTER TABLE "global_models"
      ALTER COLUMN "version" DROP NOT NULL
    `);
  }
}
