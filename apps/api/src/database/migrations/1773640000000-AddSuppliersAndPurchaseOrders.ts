import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuppliersAndPurchaseOrders1773640000000 implements MigrationInterface {
  name = 'AddSuppliersAndPurchaseOrders1773640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(300) NOT NULL,
        "contact_name" varchar(200),
        "phone" varchar(20),
        "email" varchar(300),
        "rfc" varchar(13),
        "address" varchar(500),
        "payment_terms" varchar(200),
        "credit_days" integer NOT NULL DEFAULT 0,
        "notes" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_suppliers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_suppliers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_suppliers_tenant_id" ON "suppliers" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_suppliers_rfc" ON "suppliers" ("rfc")`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_order_folio_seq" (
        "tenant_id" uuid NOT NULL,
        "year" integer NOT NULL,
        "last_value" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_purchase_order_folio_seq" PRIMARY KEY ("tenant_id", "year")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "purchase_orders_status_enum" AS ENUM (
        'DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "purchase_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "folio" varchar(50) NOT NULL,
        "status" "purchase_orders_status_enum" NOT NULL,
        "subtotal" decimal(12,2) NOT NULL,
        "tax_amount" decimal(12,2) NOT NULL,
        "total" decimal(12,2) NOT NULL,
        "supplier_invoice_uuid" varchar(100),
        "ordered_at" date NOT NULL,
        "expected_at" date,
        "received_at" date,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_orders_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_purchase_orders_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_purchase_orders_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_purchase_orders_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_tenant_id" ON "purchase_orders" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_branch_id" ON "purchase_orders" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_supplier_id" ON "purchase_orders" ("supplier_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_folio" ON "purchase_orders" ("folio")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_status" ON "purchase_orders" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "purchase_order_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "quantity_received" integer NOT NULL DEFAULT 0,
        "unit_price" decimal(12,2) NOT NULL,
        "subtotal" decimal(12,2) NOT NULL,
        CONSTRAINT "PK_purchase_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_order_items_order" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_purchase_order_items_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_items_order_id" ON "purchase_order_items" ("purchase_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_items_part_id" ON "purchase_order_items" ("part_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_purchase_order_items_part_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_purchase_order_items_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "purchase_order_items"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_purchase_orders_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_purchase_orders_folio"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_purchase_orders_supplier_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_purchase_orders_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_purchase_orders_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "purchase_orders"`);
    await queryRunner.query(`DROP TYPE "purchase_orders_status_enum"`);

    await queryRunner.query(`DROP TABLE "purchase_order_folio_seq"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_suppliers_rfc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_suppliers_tenant_id"`);
    await queryRunner.query(`DROP TABLE "suppliers"`);
  }
}
