import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventory1773638873670 implements MigrationInterface {
  name = 'AddInventory1773638873670';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_stock_movements_part"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_stock_movements_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_stock_movements_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_locations" DROP CONSTRAINT "FK_stock_locations_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_locations" DROP CONSTRAINT "FK_stock_locations_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" DROP CONSTRAINT "FK_parts_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" DROP CONSTRAINT "FK_parts_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" DROP CONSTRAINT "FK_parts_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" DROP CONSTRAINT "FK_parts_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "part_categories" DROP CONSTRAINT "FK_part_categories_tenant"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_part_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_movements_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_locations_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stock_locations_branch_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_tenant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_sku"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_barcode"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_vehicle_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_parts_location_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_part_categories_tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_locations" DROP CONSTRAINT "UQ_stock_locations_branch_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" DROP CONSTRAINT "UQ_parts_branch_sku"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "tax_rate" SET DEFAULT '0.16'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b2da8647ef82e50376cfc1ae7f" ON "stock_movements" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b85448ca9ec4bb8fc5eefb0c29" ON "stock_movements" ("branch_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f97a2ef8af9e019a28dba407c9" ON "stock_movements" ("part_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_30dd9acc22dcb6ae51d7d34f16" ON "stock_movements" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5bde28d5396c628ec6e51cb4b4" ON "stock_locations" ("branch_id", "code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26bd188befe5edd6fc10e3381e" ON "stock_locations" ("branch_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5357ad4e91d7ce3b1f2b5dc96f" ON "stock_locations" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0e3706aea94b23348b48c48aaf" ON "parts" ("location_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4584a63ca60752c1cb750e0d9" ON "parts" ("vehicle_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_27f15d8aa6a9b21b1210d158e4" ON "parts" ("barcode") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d1c72942ded6b48c5b03036db" ON "parts" ("sku") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_daa3939e74f5ea6b913210c789" ON "parts" ("branch_id", "sku") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_44c78b093698993eac66ae4e43" ON "parts" ("branch_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_027e8d2cd4989eb80e44267766" ON "parts" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c596b3c9399aeed7517f4ded4c" ON "part_categories" ("tenant_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c596b3c9399aeed7517f4ded4c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_027e8d2cd4989eb80e44267766"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_44c78b093698993eac66ae4e43"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_daa3939e74f5ea6b913210c789"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2d1c72942ded6b48c5b03036db"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_27f15d8aa6a9b21b1210d158e4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f4584a63ca60752c1cb750e0d9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0e3706aea94b23348b48c48aaf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5357ad4e91d7ce3b1f2b5dc96f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_26bd188befe5edd6fc10e3381e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5bde28d5396c628ec6e51cb4b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_30dd9acc22dcb6ae51d7d34f16"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f97a2ef8af9e019a28dba407c9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b85448ca9ec4bb8fc5eefb0c29"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b2da8647ef82e50376cfc1ae7f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "tax_rate" SET DEFAULT 0.16`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" ADD CONSTRAINT "UQ_parts_branch_sku" UNIQUE ("branch_id", "sku")`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_locations" ADD CONSTRAINT "UQ_stock_locations_branch_code" UNIQUE ("branch_id", "code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_part_categories_tenant_id" ON "part_categories" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parts_location_id" ON "parts" ("location_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parts_vehicle_type" ON "parts" ("vehicle_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parts_barcode" ON "parts" ("barcode") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_parts_sku" ON "parts" ("sku") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_parts_branch_id" ON "parts" ("branch_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parts_tenant_id" ON "parts" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_locations_branch_id" ON "stock_locations" ("branch_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_locations_tenant_id" ON "stock_locations" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_created_at" ON "stock_movements" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_branch_id" ON "stock_movements" ("branch_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_part_id" ON "stock_movements" ("part_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_movements_tenant_id" ON "stock_movements" ("tenant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "part_categories" ADD CONSTRAINT "FK_part_categories_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" ADD CONSTRAINT "FK_parts_location" FOREIGN KEY ("location_id") REFERENCES "stock_locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" ADD CONSTRAINT "FK_parts_category" FOREIGN KEY ("category_id") REFERENCES "part_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" ADD CONSTRAINT "FK_parts_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" ADD CONSTRAINT "FK_parts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_locations" ADD CONSTRAINT "FK_stock_locations_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_locations" ADD CONSTRAINT "FK_stock_locations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_stock_movements_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
