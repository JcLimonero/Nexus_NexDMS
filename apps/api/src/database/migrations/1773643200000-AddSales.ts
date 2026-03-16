import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSales1773643200000 implements MigrationInterface {
  name = 'AddSales1773643200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sale_ticket_seq" (
        "tenant_id" uuid NOT NULL,
        "year" integer NOT NULL,
        "last_value" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_sale_ticket_seq" PRIMARY KEY ("tenant_id", "year")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "sales_sale_type_enum" AS ENUM (
        'COUNTER', 'SERVICE_ORDER'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "sales_status_enum" AS ENUM (
        'OPEN', 'PAID', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "sales_payment_method_enum" AS ENUM (
        'CASH', 'CARD', 'TRANSFER', 'MIXED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "sales_price_list_enum" AS ENUM (
        'PUBLIC', 'WHOLESALE', 'BUSINESS'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "sale_payments_method_enum" AS ENUM (
        'CASH', 'CARD', 'TRANSFER'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sales" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "cash_session_id" uuid,
        "client_id" uuid,
        "user_id" uuid NOT NULL,
        "sale_type" "sales_sale_type_enum" NOT NULL,
        "status" "sales_status_enum" NOT NULL,
        "payment_method" "sales_payment_method_enum" NOT NULL,
        "price_list" "sales_price_list_enum" NOT NULL,
        "subtotal" decimal(12,2) NOT NULL,
        "discount" decimal(12,2) NOT NULL DEFAULT 0,
        "tax_amount" decimal(12,2) NOT NULL,
        "total" decimal(12,2) NOT NULL,
        "ticket_number" varchar(50) NOT NULL,
        "cfdi_uuid" varchar(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sales_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_sales_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_sales_cash_session" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_sales_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_sales_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_sales_tenant_id" ON "sales" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_branch_id" ON "sales" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_cash_session_id" ON "sales" ("cash_session_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_status" ON "sales" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_ticket_number" ON "sales" ("ticket_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_created_at" ON "sales" ("created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "sale_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sale_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" decimal(12,2) NOT NULL,
        "discount" decimal(12,2) NOT NULL DEFAULT 0,
        "subtotal" decimal(12,2) NOT NULL,
        CONSTRAINT "PK_sale_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sale_items_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_sale_items_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_sale_items_sale_id" ON "sale_items" ("sale_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sale_items_part_id" ON "sale_items" ("part_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "sale_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sale_id" uuid NOT NULL,
        "method" "sale_payments_method_enum" NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "reference" varchar(200),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sale_payments_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_sale_payments_sale_id" ON "sale_payments" ("sale_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_sale_payments_sale_id"`);
    await queryRunner.query(`DROP TABLE "sale_payments"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_sale_items_part_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sale_items_sale_id"`);
    await queryRunner.query(`DROP TABLE "sale_items"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_sales_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sales_ticket_number"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sales_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sales_cash_session_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sales_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sales_tenant_id"`);
    await queryRunner.query(`DROP TABLE "sales"`);

    await queryRunner.query(`DROP TYPE "sale_payments_method_enum"`);
    await queryRunner.query(`DROP TYPE "sales_price_list_enum"`);
    await queryRunner.query(`DROP TYPE "sales_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "sales_status_enum"`);
    await queryRunner.query(`DROP TYPE "sales_sale_type_enum"`);

    await queryRunner.query(`DROP TABLE "sale_ticket_seq"`);
  }
}
