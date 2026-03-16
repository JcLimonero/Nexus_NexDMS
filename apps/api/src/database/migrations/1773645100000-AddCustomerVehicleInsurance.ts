import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerVehicleInsurance1773645100000 implements MigrationInterface {
  name = 'AddCustomerVehicleInsurance1773645100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" ADD "insurance_company" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" ADD "insurance_policy_number" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" ADD "insurance_expiration_date" DATE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" DROP COLUMN "insurance_expiration_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" DROP COLUMN "insurance_policy_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" DROP COLUMN "insurance_company"`,
    );
  }
}
