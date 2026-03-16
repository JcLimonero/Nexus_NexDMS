import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGlobalModelsUnitLocationsCatalogUnits1773643300000 implements MigrationInterface {
  name = 'AddGlobalModelsUnitLocationsCatalogUnits1773643300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "global_models_vehicle_type_enum" AS ENUM (
        'MOTORCYCLE', 'CAR'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "global_models" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "brand_name" varchar(100) NOT NULL,
        "vehicle_type" "global_models_vehicle_type_enum" NOT NULL,
        "model" varchar(200) NOT NULL,
        "year_start" integer NOT NULL,
        "year_end" integer,
        "displacement" integer,
        "door_count" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_global_models" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_global_models_brand_name" ON "global_models" ("brand_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_global_models_vehicle_type" ON "global_models" ("vehicle_type")`,
    );

    await queryRunner.query(`
      CREATE TYPE "unit_locations_zone_enum" AS ENUM (
        'LOT', 'EXHIBITION', 'WAREHOUSE'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "unit_locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "code" varchar(20) NOT NULL,
        "zone" "unit_locations_zone_enum" NOT NULL,
        "space" varchar(20) NOT NULL,
        "description" varchar(200),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unit_locations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_unit_locations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_locations_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "UQ_unit_locations_branch_code" UNIQUE ("branch_id", "code")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_unit_locations_tenant_id" ON "unit_locations" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_locations_branch_id" ON "unit_locations" ("branch_id")`,
    );

    await queryRunner.query(`
      CREATE TYPE "catalog_units_vehicle_type_enum" AS ENUM (
        'MOTORCYCLE', 'CAR'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "catalog_units_status_enum" AS ENUM (
        'AVAILABLE', 'RESERVED', 'SOLD', 'WRITTEN_OFF'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "catalog_units" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "global_model_id" uuid,
        "vehicle_type" "catalog_units_vehicle_type_enum" NOT NULL,
        "brand" varchar(100) NOT NULL,
        "model" varchar(200) NOT NULL,
        "year" integer NOT NULL,
        "version" varchar(200),
        "color" varchar(100) NOT NULL,
        "serial_number" varchar(100) NOT NULL,
        "engine_number" varchar(100),
        "displacement" integer,
        "door_count" integer,
        "cost_price" decimal(12,2) NOT NULL,
        "list_price" decimal(12,2) NOT NULL,
        "sale_price" decimal(12,2) NOT NULL,
        "status" "catalog_units_status_enum" NOT NULL,
        "location_id" uuid,
        "image_key" varchar(500),
        "images_keys" text array,
        "notes" text,
        "acquisition_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_catalog_units" PRIMARY KEY ("id"),
        CONSTRAINT "FK_catalog_units_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_catalog_units_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_catalog_units_global_model" FOREIGN KEY ("global_model_id") REFERENCES "global_models"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_catalog_units_location" FOREIGN KEY ("location_id") REFERENCES "unit_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "UQ_catalog_units_serial_number" UNIQUE ("serial_number")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_catalog_units_tenant_id" ON "catalog_units" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_catalog_units_branch_id" ON "catalog_units" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_catalog_units_serial_number" ON "catalog_units" ("serial_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_catalog_units_status" ON "catalog_units" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_catalog_units_vehicle_type" ON "catalog_units" ("vehicle_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_catalog_units_vehicle_type"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_catalog_units_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_catalog_units_serial_number"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_catalog_units_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_catalog_units_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "catalog_units"`);
    await queryRunner.query(`DROP TYPE "catalog_units_status_enum"`);
    await queryRunner.query(`DROP TYPE "catalog_units_vehicle_type_enum"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_locations_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_locations_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "unit_locations"`);
    await queryRunner.query(`DROP TYPE "unit_locations_zone_enum"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_global_models_vehicle_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_global_models_brand_name"`,
    );
    await queryRunner.query(`DROP TABLE "global_models"`);
    await queryRunner.query(`DROP TYPE "global_models_vehicle_type_enum"`);
  }
}
