import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleTypesCombustionTypesRefactorGlobalModels1773647800000 implements MigrationInterface {
  name = 'AddVehicleTypesCombustionTypesRefactorGlobalModels1773647800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create vehicle_types table
    await queryRunner.query(`
      CREATE TABLE "vehicle_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(50) NOT NULL,
        "label" varchar(100) NOT NULL,
        "sort_order" smallint NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicle_types_code" UNIQUE ("code")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_types_code" ON "vehicle_types" ("code")`,
    );
    await queryRunner.query(`
      INSERT INTO "vehicle_types" ("id", "code", "label", "sort_order") VALUES
        (uuid_generate_v4(), 'MOTORCYCLE', 'Moto', 1),
        (uuid_generate_v4(), 'CAR', 'Auto', 2)
    `);

    // 2. Create combustion_types table
    await queryRunner.query(`
      CREATE TABLE "combustion_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(50) NOT NULL,
        "label" varchar(100) NOT NULL,
        "sort_order" smallint NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_combustion_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_combustion_types_code" UNIQUE ("code")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_combustion_types_code" ON "combustion_types" ("code")`,
    );
    await queryRunner.query(`
      INSERT INTO "combustion_types" ("id", "code", "label", "sort_order") VALUES
        (uuid_generate_v4(), 'GASOLINE', 'Gasolina', 1),
        (uuid_generate_v4(), 'DIESEL', 'Diésel', 2),
        (uuid_generate_v4(), 'ELECTRIC', 'Eléctrico', 3),
        (uuid_generate_v4(), 'HYBRID', 'Híbrido', 4),
        (uuid_generate_v4(), 'PLUGIN_HYBRID', 'Híbrido enchufable', 5)
    `);

    // 3. Add vehicle_type_id and combustion_type_id to global_models
    await queryRunner.query(
      `ALTER TABLE "global_models" ADD "vehicle_type_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" ADD "combustion_type_id" uuid`,
    );

    // 4. Migrate vehicle_type enum to vehicle_type_id
    await queryRunner.query(`
      UPDATE "global_models" gm
      SET "vehicle_type_id" = vt.id
      FROM "vehicle_types" vt
      WHERE vt.code = gm.vehicle_type::text
    `);

    // 5. Drop year_end column
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP COLUMN "year_end"`,
    );

    // 6. Rename year_start to year
    await queryRunner.query(
      `ALTER TABLE "global_models" RENAME COLUMN "year_start" TO "year"`,
    );

    // 7. Drop vehicle_type column and enum
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_global_models_vehicle_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP COLUMN "vehicle_type"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "global_models_vehicle_type_enum"`,
    );

    // 8. Make vehicle_type_id NOT NULL and add FK
    await queryRunner.query(
      `ALTER TABLE "global_models" ALTER COLUMN "vehicle_type_id" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "global_models"
      ADD CONSTRAINT "FK_global_models_vehicle_type"
      FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "global_models"
      ADD CONSTRAINT "FK_global_models_combustion_type"
      FOREIGN KEY ("combustion_type_id") REFERENCES "combustion_types"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_global_models_vehicle_type_id" ON "global_models" ("vehicle_type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_global_models_combustion_type_id" ON "global_models" ("combustion_type_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP CONSTRAINT "FK_global_models_combustion_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP CONSTRAINT "FK_global_models_vehicle_type"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_global_models_combustion_type_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_global_models_vehicle_type_id"`,
    );
    await queryRunner.query(`
      CREATE TYPE "global_models_vehicle_type_enum" AS ENUM ('MOTORCYCLE', 'CAR')
    `);
    await queryRunner.query(
      `ALTER TABLE "global_models" ADD "vehicle_type" "global_models_vehicle_type_enum"`,
    );
    await queryRunner.query(`
      UPDATE "global_models" gm
      SET "vehicle_type" = vt.code::"global_models_vehicle_type_enum"
      FROM "vehicle_types" vt
      WHERE vt.id = gm.vehicle_type_id
    `);
    await queryRunner.query(
      `ALTER TABLE "global_models" ALTER COLUMN "vehicle_type" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP COLUMN "combustion_type_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP COLUMN "vehicle_type_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" RENAME COLUMN "year" TO "year_start"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" ADD "year_end" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_global_models_vehicle_type" ON "global_models" ("vehicle_type")`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_vehicle_types_code"`,
    );
    await queryRunner.query(`DROP TABLE "vehicle_types"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_combustion_types_code"`,
    );
    await queryRunner.query(`DROP TABLE "combustion_types"`);
  }
}
