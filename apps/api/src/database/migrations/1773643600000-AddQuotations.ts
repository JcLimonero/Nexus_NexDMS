import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuotations1773643600000 implements MigrationInterface {
  name = 'AddQuotations1773643600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "quotation_folio_seq" (
        "tenant_id" uuid NOT NULL,
        "year" integer NOT NULL,
        "last_value" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_quotation_folio_seq" PRIMARY KEY ("tenant_id", "year")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "quotations_type_enum" AS ENUM (
        'PARTS', 'SERVICE', 'UNIT'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "quotations_status_enum" AS ENUM (
        'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT',
        'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "quotations_price_list_enum" AS ENUM (
        'PUBLIC', 'WHOLESALE', 'BUSINESS'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "quotations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "client_id" uuid,
        "user_id" uuid NOT NULL,
        "approver_id" uuid,
        "type" "quotations_type_enum" NOT NULL,
        "folio" varchar(50) NOT NULL,
        "status" "quotations_status_enum" NOT NULL,
        "price_list" "quotations_price_list_enum" NOT NULL,
        "subtotal" decimal(12,2) NOT NULL,
        "discount_pct" decimal(5,2) NOT NULL DEFAULT 0,
        "discount_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "tax_amount" decimal(12,2) NOT NULL,
        "total" decimal(12,2) NOT NULL,
        "conditions" text,
        "validity_date" date,
        "pdf_key" varchar(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quotations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quotations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_quotations_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_quotations_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_quotations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_quotations_approver" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_quotations_tenant_id" ON "quotations" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quotations_branch_id" ON "quotations" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quotations_status" ON "quotations" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quotations_folio" ON "quotations" ("folio")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quotations_created_at" ON "quotations" ("created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "quotation_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "quotation_id" uuid NOT NULL,
        "part_id" uuid,
        "catalog_unit_id" uuid,
        "description" varchar(500) NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "unit_price" decimal(12,2) NOT NULL,
        "discount" decimal(12,2) NOT NULL DEFAULT 0,
        "subtotal" decimal(12,2) NOT NULL,
        CONSTRAINT "PK_quotation_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quotation_items_quotation" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_quotation_items_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_quotation_items_catalog_unit" FOREIGN KEY ("catalog_unit_id") REFERENCES "catalog_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_quotation_items_quotation_id" ON "quotation_items" ("quotation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quotation_items_part_id" ON "quotation_items" ("part_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quotation_items_catalog_unit_id" ON "quotation_items" ("catalog_unit_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_quotation_items_catalog_unit_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_quotation_items_part_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_quotation_items_quotation_id"`,
    );
    await queryRunner.query(`DROP TABLE "quotation_items"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_quotations_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_quotations_folio"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_quotations_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_quotations_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_quotations_tenant_id"`);
    await queryRunner.query(`DROP TABLE "quotations"`);

    await queryRunner.query(`DROP TYPE "quotations_price_list_enum"`);
    await queryRunner.query(`DROP TYPE "quotations_status_enum"`);
    await queryRunner.query(`DROP TYPE "quotations_type_enum"`);

    await queryRunner.query(`DROP TABLE "quotation_folio_seq"`);
  }
}
