import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGlobalBrands1773649100000 implements MigrationInterface {
  name = 'AddGlobalBrands1773649100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create global_brands table
    await queryRunner.query(`
      CREATE TABLE "global_brands" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "sort_order" smallint NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_global_brands" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_global_brands_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_global_brands_name" ON "global_brands" ("name")`,
    );

    // 2. Insert unique brands from global_models
    await queryRunner.query(`
      INSERT INTO "global_brands" ("name", "sort_order")
      SELECT DISTINCT TRIM("brand_name"), 0
      FROM "global_models"
      WHERE "brand_name" IS NOT NULL AND TRIM("brand_name") != ''
    `);

    // 2b. Ensure we have at least one brand for orphaned rows (NULL/empty brand_name)
    const orphanCount = await queryRunner.query(
      `SELECT COUNT(*) as c FROM "global_models" WHERE "brand_name" IS NULL OR TRIM(COALESCE("brand_name", '')) = ''`,
    );
    const hasOrphans = Number((orphanCount as { c: string }[])?.[0]?.c ?? 0) > 0;
    if (hasOrphans) {
      await queryRunner.query(`
        INSERT INTO "global_brands" ("name", "sort_order")
        VALUES ('Otros', 999)
        ON CONFLICT ("name") DO NOTHING
      `);
    }

    // 3. Add brand_id to global_models
    await queryRunner.query(
      `ALTER TABLE "global_models" ADD "brand_id" uuid`,
    );

    // 4. Populate brand_id from brand_name
    await queryRunner.query(`
      UPDATE "global_models" gm
      SET "brand_id" = gb.id
      FROM "global_brands" gb
      WHERE TRIM(gm."brand_name") = gb."name"
    `);
    if (hasOrphans) {
      await queryRunner.query(`
        UPDATE "global_models" gm
        SET "brand_id" = (SELECT id FROM "global_brands" WHERE "name" = 'Otros' LIMIT 1)
        WHERE gm."brand_id" IS NULL
      `);
    }

    // 5. Drop old index and column, add FK
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_global_models_brand_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP COLUMN "brand_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" ALTER COLUMN "brand_id" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "global_models"
      ADD CONSTRAINT "FK_global_models_brand"
      FOREIGN KEY ("brand_id") REFERENCES "global_brands"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_global_models_brand_id" ON "global_models" ("brand_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP CONSTRAINT "FK_global_models_brand"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_global_models_brand_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" ADD "brand_name" varchar(100)`,
    );
    await queryRunner.query(`
      UPDATE "global_models" gm
      SET "brand_name" = gb."name"
      FROM "global_brands" gb
      WHERE gm."brand_id" = gb."id"
    `);
    await queryRunner.query(
      `ALTER TABLE "global_models" ALTER COLUMN "brand_name" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP COLUMN "brand_id"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_global_models_brand_name" ON "global_models" ("brand_name")`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_global_brands_name"`,
    );
    await queryRunner.query(`DROP TABLE "global_brands"`);
  }
}
