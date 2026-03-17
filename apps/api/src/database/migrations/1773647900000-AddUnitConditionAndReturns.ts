import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitConditionAndReturns1773647900000 implements MigrationInterface {
  name = 'AddUnitConditionAndReturns1773647900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "catalog_units_condition_type_enum" AS ENUM ('NEW', 'USED')
    `);

    await queryRunner.query(`
      ALTER TABLE "catalog_units"
      ADD COLUMN "condition_type" "catalog_units_condition_type_enum" NOT NULL DEFAULT 'NEW'
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_catalog_units_condition_type" ON "catalog_units" ("condition_type")`,
    );

    await queryRunner.query(`
      CREATE TABLE "unit_returns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "catalog_unit_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "unit_sale_id" uuid,
        "return_date" date NOT NULL,
        "buyback_price" decimal(12,2) NOT NULL,
        "mileage" integer,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unit_returns" PRIMARY KEY ("id"),
        CONSTRAINT "FK_unit_returns_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_returns_catalog_unit" FOREIGN KEY ("catalog_unit_id") REFERENCES "catalog_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_returns_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_returns_unit_sale" FOREIGN KEY ("unit_sale_id") REFERENCES "unit_sales"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_unit_returns_catalog_unit_id" ON "unit_returns" ("catalog_unit_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_returns_client_id" ON "unit_returns" ("client_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "unit_returns"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_catalog_units_condition_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_units" DROP COLUMN "condition_type"`,
    );
    await queryRunner.query(`DROP TYPE "catalog_units_condition_type_enum"`);
  }
}
