import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchesTenantsEndpoints1773630731441 implements MigrationInterface {
  name = 'AddBranchesTenantsEndpoints1773630731441';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'MECHANIC', 'SELLER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "tax_rate" SET DEFAULT '0.16'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "tax_rate" SET DEFAULT 0.16`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum_old" AS ENUM('ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'MECHANIC', 'SELLER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`,
    );
  }
}
