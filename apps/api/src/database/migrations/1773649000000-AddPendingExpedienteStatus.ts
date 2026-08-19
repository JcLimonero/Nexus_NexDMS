import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingExpedienteStatus1773649000000
  implements MigrationInterface
{
  name = 'AddPendingExpedienteStatus1773649000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "catalog_units_status_enum" ADD VALUE 'PENDING_EXPEDIENTE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite eliminar valores de enum fácilmente.
    // Se deja vacío; revertir requiere recrear el tipo.
  }
}