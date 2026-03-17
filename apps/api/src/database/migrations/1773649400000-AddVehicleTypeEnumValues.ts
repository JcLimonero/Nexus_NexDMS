import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleTypeEnumValues1773649400000 implements MigrationInterface {
  name = 'AddVehicleTypeEnumValues1773649400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const newValues = ['SUV', 'MINIVAN', 'TRUCK', 'VAN', 'CARGO_VAN', 'BOX_TRUCK'];

    for (const val of newValues) {
      await queryRunner.query(
        `ALTER TYPE "customer_vehicles_vehicle_type_enum" ADD VALUE '${val}'`,
      );
      await queryRunner.query(
        `ALTER TYPE "catalog_units_vehicle_type_enum" ADD VALUE '${val}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite eliminar valores de enum fácilmente.
    // Revertir requeriría recrear el tipo. Se deja vacío.
  }
}
