import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitReservations1773643400000 implements MigrationInterface {
  name = 'AddUnitReservations1773643400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "unit_reservations_status_enum" AS ENUM (
        'ACTIVE', 'CONVERTED', 'RELEASED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "unit_reservations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "catalog_unit_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "advance_amount" decimal(12,2) NOT NULL,
        "status" "unit_reservations_status_enum" NOT NULL,
        "notes" text,
        "released_by_id" uuid,
        "release_reason" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unit_reservations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_unit_reservations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_reservations_catalog_unit" FOREIGN KEY ("catalog_unit_id") REFERENCES "catalog_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_reservations_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_reservations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_unit_reservations_released_by" FOREIGN KEY ("released_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_unit_reservations_tenant_id" ON "unit_reservations" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_reservations_catalog_unit_id" ON "unit_reservations" ("catalog_unit_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_reservations_client_id" ON "unit_reservations" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unit_reservations_status" ON "unit_reservations" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_reservations_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_reservations_client_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_reservations_catalog_unit_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unit_reservations_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "unit_reservations"`);
    await queryRunner.query(`DROP TYPE "unit_reservations_status_enum"`);
  }
}
