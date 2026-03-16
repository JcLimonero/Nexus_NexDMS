import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationLogs1773644700000 implements MigrationInterface {
  name = 'AddNotificationLogs1773644700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_logs_channel_enum" AS ENUM (
        'WHATSAPP', 'EMAIL', 'SMS'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_logs_status_enum" AS ENUM (
        'PENDING', 'SENT', 'FAILED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid,
        "channel" "notification_logs_channel_enum" NOT NULL,
        "template_key" varchar(50) NOT NULL,
        "reference_type" varchar(50) NOT NULL,
        "reference_id" uuid NOT NULL,
        "recipient" varchar(300) NOT NULL,
        "status" "notification_logs_status_enum" NOT NULL DEFAULT 'PENDING',
        "error_message" text,
        "metadata" jsonb,
        "sent_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_notification_logs_tenant_id" ON "notification_logs" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_logs_reference" ON "notification_logs" ("reference_type", "reference_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_logs_created_at" ON "notification_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notification_logs_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notification_logs_reference"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notification_logs_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "notification_logs"`);
    await queryRunner.query(`DROP TYPE "notification_logs_status_enum"`);
    await queryRunner.query(`DROP TYPE "notification_logs_channel_enum"`);
  }
}
