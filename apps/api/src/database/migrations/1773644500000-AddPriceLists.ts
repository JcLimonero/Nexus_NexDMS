import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceLists1773644500000 implements MigrationInterface {
  name = 'AddPriceLists1773644500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."price_lists_type_enum" AS ENUM('PUBLIC', 'WHOLESALE', 'BUSINESS')
    `);
    await queryRunner.query(`
      CREATE TABLE "price_lists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "type" "public"."price_lists_type_enum" NOT NULL,
        "discount_pct" numeric(5,2) NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_lists_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_price_lists_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_price_lists_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "UQ_price_lists_branch_name" UNIQUE ("branch_id", "name")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_price_lists_tenant_id" ON "price_lists" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_price_lists_branch_id" ON "price_lists" ("branch_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_price_lists_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_price_lists_tenant_id"`);
    await queryRunner.query(`DROP TABLE "price_lists"`);
    await queryRunner.query(`DROP TYPE "public"."price_lists_type_enum"`);
  }
}
