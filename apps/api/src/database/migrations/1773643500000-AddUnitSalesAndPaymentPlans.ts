import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitSalesAndPaymentPlans1773643500000 implements MigrationInterface {
  name = 'AddUnitSalesAndPaymentPlans1773643500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "unit_sale_folio_seq" (
        "tenant_id" uuid NOT NULL,
        "year" integer NOT NULL,
        "last_value" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_unit_sale_folio_seq" PRIMARY KEY ("tenant_id", "year")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "unit_sales_financing_type_enum" AS ENUM (
        'CASH', 'AGENCY_CREDIT', 'BANK_CREDIT'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "unit_sales_status_enum" AS ENUM (
        'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "unit_sales" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "catalog_unit_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "reservation_id" uuid,
        "folio" varchar(50) NOT NULL,
        "list_price" decimal(12,2) NOT NULL,
        "final_price" decimal(12,2) NOT NULL,
        "advance_applied" decimal(12,2) NOT NULL DEFAULT 0,
        "down_payment" decimal(12,2) NOT NULL DEFAULT 0,
        "financing_type" "unit_sales_financing_type_enum" NOT NULL,
        "bank_financier" varchar(200),
        "bank_folio" varchar(100),
        "status" "unit_sales_status_enum" NOT NULL,
        "cfdi_uuid" varchar(100),
        "delivery_date" date,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unit_sales" PRIMARY KEY ("id"),
        CONSTRAINT "FK_unit_sales_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_sales_catalog_unit" FOREIGN KEY ("catalog_unit_id") REFERENCES "catalog_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_sales_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_sales_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_sales_reservation" FOREIGN KEY ("reservation_id") REFERENCES "unit_reservations"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_unit_sales_tenant_id" ON "unit_sales" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_sales_catalog_unit_id" ON "unit_sales" ("catalog_unit_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_sales_client_id" ON "unit_sales" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_sales_status" ON "unit_sales" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_sales_folio" ON "unit_sales" ("folio")`,
    );

    await queryRunner.query(`
      CREATE TYPE "payment_plans_status_enum" AS ENUM (
        'ACTIVE', 'PAID_OFF', 'OVERDUE'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "unit_sale_id" uuid NOT NULL,
        "installment_count" integer NOT NULL,
        "monthly_amount" decimal(12,2) NOT NULL,
        "interest_rate" decimal(5,2) NOT NULL,
        "total_amount" decimal(12,2) NOT NULL,
        "first_payment_date" date NOT NULL,
        "status" "payment_plans_status_enum" NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_plans" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payment_plans_unit_sale" FOREIGN KEY ("unit_sale_id") REFERENCES "unit_sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_payment_plans_unit_sale_id" ON "payment_plans" ("unit_sale_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_plans_status" ON "payment_plans" ("status")`,
    );

    await queryRunner.query(`
      CREATE TYPE "payment_plan_installments_status_enum" AS ENUM (
        'PENDING', 'PAID', 'OVERDUE'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_plan_installments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "payment_plan_id" uuid NOT NULL,
        "installment_number" integer NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "due_date" date NOT NULL,
        "paid_date" date,
        "status" "payment_plan_installments_status_enum" NOT NULL,
        "payment_method" varchar(50),
        "payment_reference" varchar(200),
        "cfdi_uuid" varchar(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_plan_installments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payment_plan_installments_plan" FOREIGN KEY ("payment_plan_id") REFERENCES "payment_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_payment_plan_installments_plan_id" ON "payment_plan_installments" ("payment_plan_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_plan_installments_due_date" ON "payment_plan_installments" ("due_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_plan_installments_status" ON "payment_plan_installments" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_plan_installments_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_plan_installments_due_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_plan_installments_plan_id"`,
    );
    await queryRunner.query(`DROP TABLE "payment_plan_installments"`);
    await queryRunner.query(
      `DROP TYPE "payment_plan_installments_status_enum"`,
    );

    await queryRunner.query(`DROP INDEX "public"."IDX_payment_plans_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_plans_unit_sale_id"`,
    );
    await queryRunner.query(`DROP TABLE "payment_plans"`);
    await queryRunner.query(`DROP TYPE "payment_plans_status_enum"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_unit_sales_folio"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_unit_sales_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_unit_sales_client_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_sales_catalog_unit_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_unit_sales_tenant_id"`);
    await queryRunner.query(`DROP TABLE "unit_sales"`);
    await queryRunner.query(`DROP TYPE "unit_sales_status_enum"`);
    await queryRunner.query(`DROP TYPE "unit_sales_financing_type_enum"`);

    await queryRunner.query(`DROP TABLE "unit_sale_folio_seq"`);
  }
}
