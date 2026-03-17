import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleCategories1773649600000 implements MigrationInterface {
  name = 'AddVehicleCategories1773649600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create vehicle_categories table
    await queryRunner.query(`
      CREATE TABLE "vehicle_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(20) NOT NULL,
        "label" varchar(50) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicle_categories_code" UNIQUE ("code")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_categories_code" ON "vehicle_categories" ("code")`,
    );

    // 2. Insert MOTO and AUTO
    await queryRunner.query(`
      INSERT INTO "vehicle_categories" ("id", "code", "label") VALUES
        (uuid_generate_v4(), 'MOTO', 'Moto'),
        (uuid_generate_v4(), 'AUTO', 'Auto')
    `);

    // 3. Add category_id to vehicle_types
    await queryRunner.query(
      `ALTER TABLE "vehicle_types" ADD "category_id" uuid`,
    );

    // 4. Assign categories: MOTORCYCLE -> MOTO, rest -> AUTO
    await queryRunner.query(`
      UPDATE "vehicle_types" vt
      SET "category_id" = vc.id
      FROM "vehicle_categories" vc
      WHERE vc.code = CASE
        WHEN vt.code = 'MOTORCYCLE' THEN 'MOTO'
        ELSE 'AUTO'
      END
    `);

    // 5. Make category_id NOT NULL and add FK
    await queryRunner.query(
      `ALTER TABLE "vehicle_types" ALTER COLUMN "category_id" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "vehicle_types"
      ADD CONSTRAINT "FK_vehicle_types_category"
      FOREIGN KEY ("category_id") REFERENCES "vehicle_categories"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicle_types_category_id" ON "vehicle_types" ("category_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicle_types" DROP CONSTRAINT "FK_vehicle_types_category"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vehicle_types_category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_types" DROP COLUMN "category_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vehicle_categories_code"`,
    );
    await queryRunner.query(`DROP TABLE "vehicle_categories"`);
  }
}
