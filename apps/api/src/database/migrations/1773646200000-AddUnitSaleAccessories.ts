import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitSaleAccessories1773646200000 implements MigrationInterface {
  name = 'AddUnitSaleAccessories1773646200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "unit_sale_accessories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "unit_sale_id" uuid NOT NULL,
        "accessory_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "unit_price" decimal(12,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unit_sale_accessories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_unit_sale_accessories_sale" FOREIGN KEY ("unit_sale_id") REFERENCES "unit_sales"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_unit_sale_accessories_accessory" FOREIGN KEY ("accessory_id") REFERENCES "unit_accessories"("id") ON DELETE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_sale_accessories_sale" ON "unit_sale_accessories" ("unit_sale_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_sale_accessories_accessory" ON "unit_sale_accessories" ("accessory_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_sale_accessories_accessory"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_sale_accessories_sale"`,
    );
    await queryRunner.query(`DROP TABLE "unit_sale_accessories"`);
  }
}
