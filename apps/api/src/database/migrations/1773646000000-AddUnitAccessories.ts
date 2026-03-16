import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitAccessories1773646000000 implements MigrationInterface {
  name = 'AddUnitAccessories1773646000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "unit_accessories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "sku" character varying(100),
        "price" decimal(12,2) NOT NULL DEFAULT 0,
        "sat_product_key" character varying(20),
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unit_accessories" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_accessories_tenant_id" ON "unit_accessories" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_accessories_sku" ON "unit_accessories" ("sku")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_unit_accessories_sku"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_accessories_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "unit_accessories"`);
  }
}
