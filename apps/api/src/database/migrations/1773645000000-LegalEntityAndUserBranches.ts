import { MigrationInterface, QueryRunner } from 'typeorm';

export class LegalEntityAndUserBranches1773645000000 implements MigrationInterface {
  name = 'LegalEntityAndUserBranches1773645000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create legal_entities table (same structure as brands)
    await queryRunner.query(
      `CREATE TYPE "public"."legal_entities_type_enum" AS ENUM('MOTO', 'AUTO', 'BOTH')`,
    );
    await queryRunner.query(
      `CREATE TABLE "legal_entities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "type" "public"."legal_entities_type_enum" NOT NULL,
        "logo_key" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_legal_entities" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_legal_entities_tenant_id" ON "legal_entities" ("tenant_id")`,
    );

    // 2. Migrate data from brands to legal_entities
    await queryRunner.query(
      `INSERT INTO "legal_entities" (id, tenant_id, name, type, logo_key, is_active, created_at, updated_at)
       SELECT id, tenant_id, name, type, logo_key, is_active, created_at, updated_at FROM "brands"`,
    );

    // 3. Add legal_entity_id to branches
    await queryRunner.query(
      `ALTER TABLE "branches" ADD "legal_entity_id" uuid`,
    );
    await queryRunner.query(
      `UPDATE "branches" SET "legal_entity_id" = "brand_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "legal_entity_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_branches_legal_entity_id" ON "branches" ("legal_entity_id")`,
    );

    // 4. Create user_branches table
    await queryRunner.query(
      `CREATE TABLE "user_branches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_branches" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_branches_user_branch" ON "user_branches" ("user_id", "branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_branches_user_id" ON "user_branches" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_branches_branch_id" ON "user_branches" ("branch_id")`,
    );

    // 5. Migrate users to user_branches (each user gets their current branch)
    await queryRunner.query(
      `INSERT INTO "user_branches" (user_id, branch_id, is_default)
       SELECT id, branch_id, true FROM "users" WHERE deleted_at IS NULL`,
    );

    // 6. Drop brand_id from branches
    await queryRunner.query(
      `DROP INDEX "public"."IDX_608e52a910eeaeee5248786ae4"`,
    );
    await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "brand_id"`);

    // 7. Drop brands table
    await queryRunner.query(
      `DROP INDEX "public"."IDX_33bb5b1b1a3a7e8b9787cd8778"`,
    );
    await queryRunner.query(`DROP TABLE "brands"`);
    await queryRunner.query(`DROP TYPE "public"."brands_type_enum"`);

    // 8. Remove brand_id and branch_id from users (user_branches holds the relationship)
    await queryRunner.query(
      `DROP INDEX "public"."IDX_01d93d1f1a8df7db7ae65751cb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a58f726a41264c8b3e86d4a1d"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "brand_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "branch_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore users columns
    await queryRunner.query(`ALTER TABLE "users" ADD "branch_id" uuid`);
    await queryRunner.query(`ALTER TABLE "users" ADD "brand_id" uuid`);
    await queryRunner.query(
      `UPDATE "users" u SET "branch_id" = (
        SELECT ub.branch_id FROM "user_branches" ub
        WHERE ub.user_id = u.id AND ub.is_default = true LIMIT 1
      )`,
    );
    await queryRunner.query(
      `UPDATE "users" u SET "brand_id" = (
        SELECT b.legal_entity_id FROM "user_branches" ub
        JOIN "branches" b ON b.id = ub.branch_id
        WHERE ub.user_id = u.id AND ub.is_default = true LIMIT 1
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a58f726a41264c8b3e86d4a1d" ON "users" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_01d93d1f1a8df7db7ae65751cb" ON "users" ("brand_id")`,
    );

    // Restore brands table
    await queryRunner.query(
      `CREATE TYPE "public"."brands_type_enum" AS ENUM('MOTO', 'AUTO', 'BOTH')`,
    );
    await queryRunner.query(
      `CREATE TABLE "brands" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "type" "public"."brands_type_enum" NOT NULL,
        "logo_key" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `INSERT INTO "brands" SELECT * FROM "legal_entities"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_33bb5b1b1a3a7e8b9787cd8778" ON "brands" ("tenant_id")`,
    );

    // Restore brand_id to branches
    await queryRunner.query(`ALTER TABLE "branches" ADD "brand_id" uuid`);
    await queryRunner.query(
      `UPDATE "branches" SET "brand_id" = "legal_entity_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "brand_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_608e52a910eeaeee5248786ae4" ON "branches" ("brand_id")`,
    );

    // Drop legal_entity_id from branches
    await queryRunner.query(
      `DROP INDEX "public"."IDX_branches_legal_entity_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" DROP COLUMN "legal_entity_id"`,
    );

    // Drop user_branches
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_branches_branch_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_user_branches_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_branches_user_branch"`,
    );
    await queryRunner.query(`DROP TABLE "user_branches"`);

    // Drop legal_entities
    await queryRunner.query(
      `DROP INDEX "public"."IDX_legal_entities_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "legal_entities"`);
    await queryRunner.query(`DROP TYPE "public"."legal_entities_type_enum"`);
  }
}
