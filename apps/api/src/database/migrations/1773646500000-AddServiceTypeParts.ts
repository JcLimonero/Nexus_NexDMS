import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceTypeParts1773646500000 implements MigrationInterface {
  name = 'AddServiceTypeParts1773646500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_type_parts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_type_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "quantity_required" integer NOT NULL,
        CONSTRAINT "PK_service_type_parts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_type_parts_service_type" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_service_type_parts_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_service_type_parts_type_part" ON "service_type_parts" ("service_type_id", "part_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_type_parts_service_type_id" ON "service_type_parts" ("service_type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_type_parts_part_id" ON "service_type_parts" ("part_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_type_parts_part_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_type_parts_service_type_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_service_type_parts_type_part"`,
    );
    await queryRunner.query(`DROP TABLE "service_type_parts"`);
  }
}
