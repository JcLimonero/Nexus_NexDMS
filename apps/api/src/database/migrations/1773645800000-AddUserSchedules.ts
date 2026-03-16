import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSchedules1773645800000 implements MigrationInterface {
  name = 'AddUserSchedules1773645800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "day_of_week" smallint NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_schedules_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_schedules_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_day_of_week" CHECK ("day_of_week" >= 0 AND "day_of_week" <= 6)
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_schedules_user_id" ON "user_schedules" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_schedules_branch_id" ON "user_schedules" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_schedules_user_branch_day" ON "user_schedules" ("user_id", "branch_id", "day_of_week")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_schedules_user_branch_day"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_schedules_branch_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_user_schedules_user_id"`);
    await queryRunner.query(`DROP TABLE "user_schedules"`);
  }
}
