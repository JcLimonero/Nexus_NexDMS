import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleCatalogTables1773649800000 implements MigrationInterface {
  name = 'AddVehicleCatalogTables1773649800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vehicle_models" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "brand_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_models" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicle_models_brand_name" UNIQUE ("brand_id", "name"),
        CONSTRAINT "FK_vehicle_models_brand" FOREIGN KEY ("brand_id") REFERENCES "global_brands"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_models_brand_id" ON "vehicle_models" ("brand_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "vehicle_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "brand_id" uuid NOT NULL,
        "model_id" uuid NOT NULL,
        "year" int NOT NULL,
        "name" varchar(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_versions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicle_versions_brand_model_year_name" UNIQUE ("brand_id", "model_id", "year", "name"),
        CONSTRAINT "FK_vehicle_versions_brand" FOREIGN KEY ("brand_id") REFERENCES "global_brands"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vehicle_versions_model" FOREIGN KEY ("model_id") REFERENCES "vehicle_models"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_versions_model_id" ON "vehicle_versions" ("model_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_versions_brand_year" ON "vehicle_versions" ("brand_id", "year")`,
    );

    await queryRunner.query(`
      CREATE TABLE "vehicle_colors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "brand_id" uuid NOT NULL,
        "model_id" uuid NOT NULL,
        "version_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "color_type" varchar(20) NOT NULL CHECK ("color_type" IN ('INTERIOR', 'EXTERIOR')),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_colors" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicle_colors_brand_model_version_name_type" UNIQUE ("brand_id", "model_id", "version_id", "name", "color_type"),
        CONSTRAINT "FK_vehicle_colors_brand" FOREIGN KEY ("brand_id") REFERENCES "global_brands"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vehicle_colors_model" FOREIGN KEY ("model_id") REFERENCES "vehicle_models"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vehicle_colors_version" FOREIGN KEY ("version_id") REFERENCES "vehicle_versions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_colors_version_id" ON "vehicle_colors" ("version_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_colors_type" ON "vehicle_colors" ("color_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicle_colors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicle_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicle_models"`);
  }
}
