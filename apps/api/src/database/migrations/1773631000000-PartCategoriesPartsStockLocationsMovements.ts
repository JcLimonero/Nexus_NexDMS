import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartCategoriesPartsStockLocationsMovements1773631000000 implements MigrationInterface {
  name = 'PartCategoriesPartsStockLocationsMovements1773631000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "part_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_part_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_part_categories_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_part_categories_tenant_id" ON "part_categories" ("tenant_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "stock_locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "code" character varying(20) NOT NULL,
        "zone" character varying(10) NOT NULL,
        "aisle" character varying(10),
        "shelf" character varying(10),
        "level" character varying(10),
        "description" character varying(200),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_locations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stock_locations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id"),
        CONSTRAINT "FK_stock_locations_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id"),
        CONSTRAINT "UQ_stock_locations_branch_code" UNIQUE ("branch_id", "code")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_locations_tenant_id" ON "stock_locations" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_locations_branch_id" ON "stock_locations" ("branch_id")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."parts_vehicle_type_enum" AS ENUM('MOTORCYCLE', 'CAR', 'BOTH')`,
    );
    await queryRunner.query(`
      CREATE TABLE "parts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "category_id" uuid,
        "location_id" uuid,
        "sku" character varying(100) NOT NULL,
        "barcode" character varying(100),
        "name" character varying(300) NOT NULL,
        "description" text,
        "vehicle_type" "public"."parts_vehicle_type_enum" NOT NULL,
        "compatible_makes" character varying(200),
        "unit_of_measure" character varying(50) NOT NULL DEFAULT 'PIECE',
        "purchase_price" numeric(12,2) NOT NULL,
        "public_price" numeric(12,2) NOT NULL,
        "wholesale_price" numeric(12,2) NOT NULL,
        "business_price" numeric(12,2) NOT NULL,
        "max_discount_pct" numeric(5,2) NOT NULL DEFAULT 10,
        "stock_quantity" integer NOT NULL DEFAULT 0,
        "min_stock" integer NOT NULL DEFAULT 1,
        "max_stock" integer,
        "image_key" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_parts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_parts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id"),
        CONSTRAINT "FK_parts_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id"),
        CONSTRAINT "FK_parts_category" FOREIGN KEY ("category_id") REFERENCES "part_categories"("id"),
        CONSTRAINT "FK_parts_location" FOREIGN KEY ("location_id") REFERENCES "stock_locations"("id"),
        CONSTRAINT "UQ_parts_branch_sku" UNIQUE ("branch_id", "sku")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_parts_tenant_id" ON "parts" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parts_branch_id" ON "parts" ("branch_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_parts_sku" ON "parts" ("sku")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_parts_barcode" ON "parts" ("barcode")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parts_vehicle_type" ON "parts" ("vehicle_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parts_location_id" ON "parts" ("location_id")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_movement_type_enum" AS ENUM('PURCHASE_IN', 'ADJUSTMENT_IN', 'SALE_OUT', 'SERVICE_OUT', 'ADJUSTMENT_OUT', 'TRANSFER_OUT', 'TRANSFER_IN')`,
    );
    await queryRunner.query(`
      CREATE TABLE "stock_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "movement_type" "public"."stock_movements_movement_type_enum" NOT NULL,
        "quantity" integer NOT NULL,
        "stock_before" integer NOT NULL,
        "stock_after" integer NOT NULL,
        "reference_id" uuid,
        "reference_type" character varying(50),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_movements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stock_movements_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id"),
        CONSTRAINT "FK_stock_movements_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id"),
        CONSTRAINT "FK_stock_movements_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_tenant_id" ON "stock_movements" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_part_id" ON "stock_movements" ("part_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_branch_id" ON "stock_movements" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_created_at" ON "stock_movements" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_part_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(
      `DROP TYPE "public"."stock_movements_movement_type_enum"`,
    );

    await queryRunner.query(`DROP INDEX "public"."IDX_parts_location_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_vehicle_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_barcode"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_sku"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_tenant_id"`);
    await queryRunner.query(`DROP TABLE "parts"`);
    await queryRunner.query(`DROP TYPE "public"."parts_vehicle_type_enum"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_locations_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_locations_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "stock_locations"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_part_categories_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "part_categories"`);
  }
}
