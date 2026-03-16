import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitAccessoryCompatibilities1773646100000 implements MigrationInterface {
  name = 'AddUnitAccessoryCompatibilities1773646100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "unit_accessory_compatibilities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accessory_id" uuid NOT NULL,
        "global_model_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unit_accessory_compatibilities" PRIMARY KEY ("id"),
        CONSTRAINT "FK_unit_accessory_compatibilities_accessory" FOREIGN KEY ("accessory_id") REFERENCES "unit_accessories"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_unit_accessory_compatibilities_model" FOREIGN KEY ("global_model_id") REFERENCES "global_models"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_unit_accessory_compatibilities" UNIQUE ("accessory_id", "global_model_id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_accessory_compatibilities_accessory" ON "unit_accessory_compatibilities" ("accessory_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_accessory_compatibilities_model" ON "unit_accessory_compatibilities" ("global_model_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_accessory_compatibilities_model"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_accessory_compatibilities_accessory"`,
    );
    await queryRunner.query(`DROP TABLE "unit_accessory_compatibilities"`);
  }
}
