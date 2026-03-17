import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPassengerCountToGlobalModels1773649700000
  implements MigrationInterface
{
  name = 'AddPassengerCountToGlobalModels1773649700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_models" ADD "passenger_count" int`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP COLUMN "passenger_count"`,
    );
  }
}
