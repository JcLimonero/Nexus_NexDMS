import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleTypesFromImage1773649300000
  implements MigrationInterface
{
  name = 'AddVehicleTypesFromImage1773649300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "vehicle_types" ("id", "code", "label") VALUES
        (uuid_generate_v4(), 'SUV', 'SUV'),
        (uuid_generate_v4(), 'MINIVAN', 'Minivan'),
        (uuid_generate_v4(), 'TRUCK', 'Camión'),
        (uuid_generate_v4(), 'VAN', 'Van'),
        (uuid_generate_v4(), 'CARGO_VAN', 'Van de carga'),
        (uuid_generate_v4(), 'BOX_TRUCK', 'Camión de caja')
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "vehicle_types"
      WHERE "code" IN ('SUV', 'MINIVAN', 'TRUCK', 'VAN', 'CARGO_VAN', 'BOX_TRUCK')
    `);
  }
}
