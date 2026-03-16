import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseOrders1773641738642 implements MigrationInterface {
  name = 'AddPurchaseOrders1773641738642';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "FK_suppliers_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_purchase_order_items_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_purchase_order_items_part"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_purchase_orders_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_purchase_orders_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_purchase_orders_supplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_purchase_orders_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_suppliers_tenant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_suppliers_rfc"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_purchase_order_items_part_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_purchase_order_items_order_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_purchase_orders_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_purchase_orders_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_purchase_orders_supplier_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_purchase_orders_folio"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_purchase_orders_status"`);
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "tax_rate" SET DEFAULT '0.16'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb19520682afb21a9037336fa7" ON "suppliers" ("rfc") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b0d0350059126fa08fddc3c7a4" ON "suppliers" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4a0c326c87a2e1ab842dbe2db6" ON "purchase_order_items" ("part_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3f92bb44026cedfe235c8b9124" ON "purchase_order_items" ("purchase_order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5272ac3aa931eedb14cd8789d6" ON "purchase_orders" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c58ed69b3492cd2b60b7f9f857" ON "purchase_orders" ("folio") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d16a885aa88447ccfd010e739b" ON "purchase_orders" ("supplier_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b0e6536d50d20e0d46f9e386c" ON "purchase_orders" ("branch_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_237678c98436e0abb48b3060c8" ON "purchase_orders" ("tenant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_3f92bb44026cedfe235c8b91244" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_4a0c326c87a2e1ab842dbe2db6a" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_4a0c326c87a2e1ab842dbe2db6a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" DROP CONSTRAINT "FK_3f92bb44026cedfe235c8b91244"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_237678c98436e0abb48b3060c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b0e6536d50d20e0d46f9e386c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d16a885aa88447ccfd010e739b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c58ed69b3492cd2b60b7f9f857"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5272ac3aa931eedb14cd8789d6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3f92bb44026cedfe235c8b9124"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4a0c326c87a2e1ab842dbe2db6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b0d0350059126fa08fddc3c7a4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb19520682afb21a9037336fa7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "tax_rate" SET DEFAULT 0.16`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_status" ON "purchase_orders" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_folio" ON "purchase_orders" ("folio") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_supplier_id" ON "purchase_orders" ("supplier_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_branch_id" ON "purchase_orders" ("branch_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_tenant_id" ON "purchase_orders" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_items_order_id" ON "purchase_order_items" ("purchase_order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_items_part_id" ON "purchase_order_items" ("part_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_suppliers_rfc" ON "suppliers" ("rfc") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_suppliers_tenant_id" ON "suppliers" ("tenant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_purchase_orders_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_purchase_orders_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_purchase_orders_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_purchase_orders_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_purchase_order_items_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" ADD CONSTRAINT "FK_purchase_order_items_order" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "FK_suppliers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
