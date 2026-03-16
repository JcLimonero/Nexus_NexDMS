import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceTypeIdToServiceOrders1773646800000 implements MigrationInterface {
  name = 'AddServiceTypeIdToServiceOrders1773646800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_orders" ADD COLUMN "service_type_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ADD CONSTRAINT "FK_service_orders_service_type" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_service_type_id" ON "service_orders" ("service_type_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_orders_service_type_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP CONSTRAINT "FK_service_orders_service_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP COLUMN "service_type_id"`,
    );
  }
}
