import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReceptionPhotos1773647000000 implements MigrationInterface {
  name = 'AddReceptionPhotos1773647000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reception_photos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reception_checklist_id" uuid NOT NULL,
        "angle" varchar(20) NOT NULL,
        "storage_key" varchar(500) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reception_photos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reception_photos_checklist" FOREIGN KEY ("reception_checklist_id") REFERENCES "reception_checklists"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_reception_photos_checklist" ON "reception_photos" ("reception_checklist_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reception_photos_checklist"`,
    );
    await queryRunner.query(`DROP TABLE "reception_photos"`);
  }
}
