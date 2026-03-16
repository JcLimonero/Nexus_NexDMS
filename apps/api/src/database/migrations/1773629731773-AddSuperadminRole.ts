import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuperadminRole1773629731773 implements MigrationInterface {
  name = 'AddSuperadminRole1773629731773';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'SUPERADMIN'`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Parámetro requerido por MigrationInterface
  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite eliminar valores de enum directamente.
    // Se deja vacío; revertir requeriría recrear el tipo.
  }
}
