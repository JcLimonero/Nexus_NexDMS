import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceTypeIdToAppointments1773646700000 implements MigrationInterface {
  name = 'AddServiceTypeIdToAppointments1773646700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD COLUMN "service_type_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_appointments_service_type" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_service_type_id" ON "appointments" ("service_type_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_appointments_service_type_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_appointments_service_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "service_type_id"`,
    );
  }
}
