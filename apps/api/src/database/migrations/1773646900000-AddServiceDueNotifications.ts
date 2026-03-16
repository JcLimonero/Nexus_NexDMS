import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceDueNotifications1773646900000 implements MigrationInterface {
  name = 'AddServiceDueNotifications1773646900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_due_notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "vehicle_id" uuid NOT NULL,
        "service_type_id" uuid NOT NULL,
        "notified_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_due_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_due_notifications_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "customer_vehicles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_service_due_notifications_service_type" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_service_due_notifications_vehicle_type" ON "service_due_notifications" ("vehicle_id", "service_type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_due_notifications_notified_at" ON "service_due_notifications" ("notified_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_due_notifications_notified_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_due_notifications_vehicle_type"`,
    );
    await queryRunner.query(`DROP TABLE "service_due_notifications"`);
  }
}
