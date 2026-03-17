import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVersionToGlobalModels1773647700000 implements MigrationInterface {
  name = 'AddVersionToGlobalModels1773647700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_models" ADD "version" varchar(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP COLUMN "version"`,
    );
  }
}
