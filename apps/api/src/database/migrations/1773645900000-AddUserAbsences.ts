import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAbsences1773645900000 implements MigrationInterface {
  name = 'AddUserAbsences1773645900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_absences_type_enum" AS ENUM('VACATION', 'SICK_LEAVE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_absences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "type" "public"."user_absences_type_enum" NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_absences" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_absences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_absences_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_user_absences_dates" CHECK ("end_date" >= "start_date")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_absences_user_id" ON "user_absences" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_absences_branch_id" ON "user_absences" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_absences_dates" ON "user_absences" ("start_date", "end_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_user_absences_dates"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_absences_branch_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_user_absences_user_id"`);
    await queryRunner.query(`DROP TABLE "user_absences"`);
    await queryRunner.query(`DROP TYPE "public"."user_absences_type_enum"`);
  }
}
