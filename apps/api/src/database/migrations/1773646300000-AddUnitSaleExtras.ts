import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitSaleExtras1773646300000 implements MigrationInterface {
  name = 'AddUnitSaleExtras1773646300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."unit_sale_extras_type_enum" AS ENUM('INSURANCE', 'PLATE_PROCESSING')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."unit_sale_extras_status_enum" AS ENUM('PENDING', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "unit_sale_extras" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "unit_sale_id" uuid NOT NULL,
        "type" "public"."unit_sale_extras_type_enum" NOT NULL,
        "provider_name" character varying(200),
        "provider_reference" character varying(200),
        "cost" decimal(12,2) NOT NULL DEFAULT 0,
        "status" "public"."unit_sale_extras_status_enum" NOT NULL DEFAULT 'PENDING',
        "notes" text,
        "extra_data" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unit_sale_extras" PRIMARY KEY ("id"),
        CONSTRAINT "FK_unit_sale_extras_sale" FOREIGN KEY ("unit_sale_id") REFERENCES "unit_sales"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_sale_extras_sale" ON "unit_sale_extras" ("unit_sale_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_sale_extras_type" ON "unit_sale_extras" ("type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_unit_sale_extras_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_unit_sale_extras_sale"`);
    await queryRunner.query(`DROP TABLE "unit_sale_extras"`);
    await queryRunner.query(
      `DROP TYPE "public"."unit_sale_extras_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."unit_sale_extras_type_enum"`);
  }
}
