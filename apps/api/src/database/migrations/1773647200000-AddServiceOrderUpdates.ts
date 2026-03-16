import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceOrderUpdates1773647200000 implements MigrationInterface {
  name = 'AddServiceOrderUpdates1773647200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_order_updates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" varchar(50) NULL,
        "message" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_order_updates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_order_updates_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_service_order_updates_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_updates_service_order" ON "service_order_updates" ("service_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_updates_created_at" ON "service_order_updates" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_order_updates_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_order_updates_service_order"`,
    );
    await queryRunner.query(`DROP TABLE "service_order_updates"`);
  }
}
