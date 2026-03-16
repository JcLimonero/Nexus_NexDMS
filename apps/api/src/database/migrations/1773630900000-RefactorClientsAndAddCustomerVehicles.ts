import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorClientsAndAddCustomerVehicles1773630900000
  implements MigrationInterface
{
  name = 'RefactorClientsAndAddCustomerVehicles1773630900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" RENAME COLUMN "name" TO "first_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "first_name" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" RENAME COLUMN "legal_name" TO "company_name"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."clients_client_type_new_enum" AS ENUM('INDIVIDUAL', 'BUSINESS')`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN "client_type_new" "public"."clients_client_type_new_enum"`,
    );
    await queryRunner.query(`
      UPDATE "clients" SET "client_type_new" = CASE
        WHEN "client_type"::text IN ('PUBLIC', 'WHOLESALE') THEN 'INDIVIDUAL'::"public"."clients_client_type_new_enum"
        ELSE 'BUSINESS'::"public"."clients_client_type_new_enum"
      END
    `);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "client_type"`);
    await queryRunner.query(
      `ALTER TABLE "clients" RENAME COLUMN "client_type_new" TO "client_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "client_type" SET NOT NULL`,
    );
    await queryRunner.query(`DROP TYPE "public"."clients_client_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."clients_client_type_new_enum" RENAME TO "clients_client_type_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "contacts" RENAME COLUMN "name" TO "first_name"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."customer_vehicles_vehicle_type_enum" AS ENUM('MOTORCYCLE', 'CAR')`,
    );
    await queryRunner.query(`
      CREATE TABLE "customer_vehicles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "owner_id" uuid NOT NULL,
        "vehicle_type" "public"."customer_vehicles_vehicle_type_enum" NOT NULL,
        "make" character varying(100) NOT NULL,
        "model" character varying(200) NOT NULL,
        "year" integer NOT NULL,
        "color" character varying(100),
        "plate" character varying(20),
        "vin" character varying(100),
        "engine_number" character varying(100),
        "mileage" integer NOT NULL DEFAULT 0,
        "assigned_contact_id" uuid,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_customer_vehicles_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_customer_vehicles_owner" FOREIGN KEY ("owner_id") REFERENCES "clients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_customer_vehicles_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_vehicles_tenant_id" ON "customer_vehicles" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_vehicles_owner_id" ON "customer_vehicles" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_vehicles_vin" ON "customer_vehicles" ("vin")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_vehicles_plate" ON "customer_vehicles" ("plate")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_customer_vehicles_plate"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_customer_vehicles_vin"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_customer_vehicles_owner_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_customer_vehicles_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "customer_vehicles"`);
    await queryRunner.query(
      `DROP TYPE "public"."customer_vehicles_vehicle_type_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "contacts" RENAME COLUMN "first_name" TO "name"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."clients_client_type_old_enum" AS ENUM('PUBLIC', 'WHOLESALE', 'COMPANY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN "client_type_old" "public"."clients_client_type_old_enum"`,
    );
    await queryRunner.query(`
      UPDATE "clients" SET "client_type_old" = CASE
        WHEN "client_type"::text = 'INDIVIDUAL' THEN 'PUBLIC'::"public"."clients_client_type_old_enum"
        ELSE 'COMPANY'::"public"."clients_client_type_old_enum"
      END
    `);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "client_type"`);
    await queryRunner.query(
      `ALTER TABLE "clients" RENAME COLUMN "client_type_old" TO "client_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "client_type" SET NOT NULL`,
    );
    await queryRunner.query(`DROP TYPE "public"."clients_client_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."clients_client_type_old_enum" RENAME TO "clients_client_type_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" RENAME COLUMN "company_name" TO "legal_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" RENAME COLUMN "first_name" TO "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "name" SET NOT NULL`,
    );
  }
}
