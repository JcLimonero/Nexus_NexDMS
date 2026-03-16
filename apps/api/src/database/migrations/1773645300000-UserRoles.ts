import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRoles1773645300000 implements MigrationInterface {
  name = 'UserRoles1773645300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new role values to users_role_enum
    const newRoles = [
      'EXECUTIVE',
      'LEGAL_ENTITY_MANAGER',
      'ADMIN_MANAGER',
      'PARTS_MANAGER',
      'AFTERSALES_MANAGER',
      'IT_MANAGER',
      'AML_OFFICER',
      'DOCUMENT_VALIDATOR',
      'AUDITOR',
    ];
    for (const role of newRoles) {
      await queryRunner.query(
        `ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS '${role}'`,
      );
    }

    // 2. Create user_roles table
    await queryRunner.query(
      `CREATE TABLE "user_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "role" "public"."users_role_enum" NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_user_roles_user_role" UNIQUE ("user_id", "role")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_user_id" ON "user_roles" ("user_id")`,
    );

    // 3. Migrate existing users.role to user_roles
    await queryRunner.query(
      `INSERT INTO "user_roles" (user_id, role)
       SELECT id, role FROM "users" WHERE deleted_at IS NULL`,
    );

    // 4. Drop role column from users
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Add role column back to users
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "role" "public"."users_role_enum"`,
    );

    // 2. Restore role from first user_role per user
    await queryRunner.query(
      `UPDATE "users" u SET "role" = (
        SELECT ur.role FROM "user_roles" ur
        WHERE ur.user_id = u.id
        ORDER BY ur.created_at ASC
        LIMIT 1
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL`,
    );

    // 3. Drop user_roles table
    await queryRunner.query(`DROP INDEX "public"."IDX_user_roles_user_id"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);

    // Note: New enum values cannot be removed in PostgreSQL
  }
}
