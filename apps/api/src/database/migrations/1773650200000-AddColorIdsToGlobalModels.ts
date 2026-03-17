import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColorIdsToGlobalModels1773650200000
  implements MigrationInterface
{
  name = 'AddColorIdsToGlobalModels1773650200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_models" ADD "exterior_color_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" ADD "interior_color_id" uuid`,
    );
    await queryRunner.query(`
      ALTER TABLE "global_models"
      ADD CONSTRAINT "FK_global_models_exterior_color"
      FOREIGN KEY ("exterior_color_id") REFERENCES "vehicle_colors"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "global_models"
      ADD CONSTRAINT "FK_global_models_interior_color"
      FOREIGN KEY ("interior_color_id") REFERENCES "vehicle_colors"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP CONSTRAINT "FK_global_models_interior_color"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP CONSTRAINT "FK_global_models_exterior_color"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP COLUMN "interior_color_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_models" DROP COLUMN "exterior_color_id"`,
    );
  }
}
