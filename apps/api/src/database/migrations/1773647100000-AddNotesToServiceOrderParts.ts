import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotesToServiceOrderParts1773647100000 implements MigrationInterface {
  name = 'AddNotesToServiceOrderParts1773647100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_order_parts" ADD COLUMN "notes" text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_order_parts" DROP COLUMN "notes"`,
    );
  }
}
