import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientTypes1773647600000 implements MigrationInterface {
  name = 'AddClientTypes1773647600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "client_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(50) NOT NULL,
        "label" varchar(100) NOT NULL,
        "sort_order" smallint NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_types_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_client_types_code" ON "client_types" ("code")`,
    );

    await queryRunner.query(`
      INSERT INTO "client_types" ("id", "code", "label", "sort_order") VALUES
        (uuid_generate_v4(), 'INDIVIDUAL', 'Persona Fisica', 1),
        (uuid_generate_v4(), 'BUSINESS', 'Persona Moral', 2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_client_types_code"`);
    await queryRunner.query(`DROP TABLE "client_types"`);
  }
}
