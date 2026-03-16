import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameScopeEnumToLegalEntity1773645700000 implements MigrationInterface {
  name = 'RenameScopeEnumToLegalEntity1773645700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_scope_enum" RENAME VALUE 'BRAND' TO 'LEGAL_ENTITY'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_scope_enum" RENAME VALUE 'BRANCH' TO 'SUCURSAL'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_scope_enum" RENAME VALUE 'LEGAL_ENTITY' TO 'BRAND'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_scope_enum" RENAME VALUE 'SUCURSAL' TO 'BRANCH'`,
    );
  }
}
