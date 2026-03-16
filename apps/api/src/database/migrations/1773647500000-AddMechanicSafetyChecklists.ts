import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMechanicSafetyChecklists1773647500000 implements MigrationInterface {
  name = 'AddMechanicSafetyChecklists1773647500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "mechanic_safety_checklists_status_enum" AS ENUM ('BUENO', 'REGULAR', 'MALO', 'REEMPLAZAR', 'OK', 'FALLA')
    `);
    await queryRunner.query(`
      CREATE TABLE "mechanic_safety_checklists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" "mechanic_safety_checklists_status_enum" NOT NULL,
        "notes" text NULL,
        "photo_key" varchar(500) NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mechanic_safety_checklists" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mechanic_safety_checklists_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mechanic_safety_checklists_item" FOREIGN KEY ("item_id") REFERENCES "mechanic_checklist_items"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_mechanic_safety_checklists_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION,
        CONSTRAINT "UQ_mechanic_safety_checklists_os_item" UNIQUE ("service_order_id", "item_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_mechanic_safety_checklists_service_order" ON "mechanic_safety_checklists" ("service_order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_mechanic_safety_checklists_service_order"`,
    );
    await queryRunner.query(`DROP TABLE "mechanic_safety_checklists"`);
    await queryRunner.query(
      `DROP TYPE "mechanic_safety_checklists_status_enum"`,
    );
  }
}
