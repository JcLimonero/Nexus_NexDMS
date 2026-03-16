import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1773629731772 implements MigrationInterface {
  name = 'InitialSchema1773629731772';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'MECHANIC', 'SELLER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_scope_enum" AS ENUM('GLOBAL', 'BRAND', 'BRANCH')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "branch_id" uuid NOT NULL, "brand_id" uuid, "first_name" character varying(200) NOT NULL, "last_name" character varying(200) NOT NULL, "email" character varying(300) NOT NULL, "password_hash" character varying(500) NOT NULL, "role" "public"."users_role_enum" NOT NULL, "scope" "public"."users_scope_enum" NOT NULL, "password_changed_at" TIMESTAMP, "login_attempts" integer NOT NULL DEFAULT '0', "blocked_until" TIMESTAMP, "totp_enabled" boolean NOT NULL DEFAULT false, "totp_secret" text, "totp_verified_at" TIMESTAMP, "phone" character varying(20), "avatar_key" character varying(500), "is_active" boolean NOT NULL DEFAULT true, "last_login_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_01d93d1f1a8df7db7ae65751cb" ON "users" ("brand_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a58f726a41264c8b3e86d4a1d" ON "users" ("branch_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_109638590074998bb72a2f2cf0" ON "users" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e9f4c2efab52114c4e99e28efb" ON "users" ("tenant_id", "email") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenants_plan_enum" AS ENUM('BASIC', 'PRO', 'ENTERPRISE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "slug" character varying(100) NOT NULL, "plan" "public"."tenants_plan_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2310ecc5cb8be427097154b18f" ON "tenants" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."brands_type_enum" AS ENUM('MOTO', 'AUTO', 'BOTH')`,
    );
    await queryRunner.query(
      `CREATE TABLE "brands" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "type" "public"."brands_type_enum" NOT NULL, "logo_key" character varying(500), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_33bb5b1b1a3a7e8b9787cd8778" ON "brands" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "branches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "brand_id" uuid NOT NULL, "name" character varying(200) NOT NULL, "slug" character varying(100) NOT NULL, "rfc" character varying(13) NOT NULL, "legal_name" character varying(300) NOT NULL, "tax_regime" character varying(10) NOT NULL, "tax_postal_code" character varying(10) NOT NULL, "address" character varying(500) NOT NULL, "city" character varying(100) NOT NULL, "state" character varying(100) NOT NULL, "counter_phone" character varying(20) NOT NULL, "parts_phone" character varying(20), "appointments_phone" character varying(20), "aftersales_phone" character varying(20), "email" character varying(200) NOT NULL, "horario" jsonb NOT NULL, "logo_key" character varying(500), "facturaapi_org_id" character varying(200), "timezone" character varying(50) NOT NULL DEFAULT 'America/Mexico_City', "tax_rate" numeric(4,2) NOT NULL DEFAULT '0.16', "max_discount_pct" numeric(5,2) NOT NULL DEFAULT '10', "quotation_validity_days" integer NOT NULL DEFAULT '15', "cfdi_serie" character varying(5), "is_primary" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c2c16397fa98d34f8db37684c4" ON "branches" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_608e52a910eeaeee5248786ae4" ON "branches" ("brand_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fda619979f40a6a44fc9baf02c" ON "branches" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_57c5cc3c2bee98f88caffc317e" ON "branches" ("tenant_id", "slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "branch_config" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "branch_id" uuid NOT NULL, "whatsapp_phone_id" text, "whatsapp_token" text, "facturaapi_api_key" text, "bank_name" character varying(100), "bank_clabe" character varying(18), "bank_account" character varying(20), "bank_holder" character varying(300), "cfdi_last_folio" integer NOT NULL DEFAULT '0', "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_54c43a1f8bf18614dfd4483977f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3db9702e8f1c4b633788a29e93" ON "branch_config" ("branch_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3db9702e8f1c4b633788a29e93"`,
    );
    await queryRunner.query(`DROP TABLE "branch_config"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_57c5cc3c2bee98f88caffc317e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fda619979f40a6a44fc9baf02c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_608e52a910eeaeee5248786ae4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c2c16397fa98d34f8db37684c4"`,
    );
    await queryRunner.query(`DROP TABLE "branches"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_33bb5b1b1a3a7e8b9787cd8778"`,
    );
    await queryRunner.query(`DROP TABLE "brands"`);
    await queryRunner.query(`DROP TYPE "public"."brands_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2310ecc5cb8be427097154b18f"`,
    );
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP TYPE "public"."tenants_plan_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e9f4c2efab52114c4e99e28efb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_109638590074998bb72a2f2cf0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a58f726a41264c8b3e86d4a1d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_01d93d1f1a8df7db7ae65751cb"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_scope_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
