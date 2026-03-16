import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointments1773643700000 implements MigrationInterface {
  name = 'AddAppointments1773643700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "appointments_origin_enum" AS ENUM (
        'INTERNAL', 'PUBLIC_PORTAL'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "appointments_status_enum" AS ENUM (
        'PENDING_CONFIRMATION', 'SCHEDULED', 'CONFIRMED',
        'COMPLETED', 'CANCELLED', 'NO_SHOW'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "client_id" uuid,
        "vehicle_id" uuid,
        "mechanic_id" uuid,
        "origin" "appointments_origin_enum" NOT NULL,
        "status" "appointments_status_enum" NOT NULL,
        "service_type" varchar(200) NOT NULL,
        "client_name" varchar(200) NOT NULL,
        "client_phone" varchar(20) NOT NULL,
        "notes" text,
        "scheduled_at" TIMESTAMP NOT NULL,
        "duration_min" integer NOT NULL DEFAULT 60,
        "reminder_sent" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appointments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_appointments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_appointments_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_appointments_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_appointments_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "customer_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_appointments_mechanic" FOREIGN KEY ("mechanic_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_tenant_id" ON "appointments" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_branch_id" ON "appointments" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_status" ON "appointments" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_scheduled_at" ON "appointments" ("scheduled_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_created_at" ON "appointments" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_appointments_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_appointments_scheduled_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_appointments_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_appointments_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_appointments_tenant_id"`);
    await queryRunner.query(`DROP TABLE "appointments"`);

    await queryRunner.query(`DROP TYPE "appointments_status_enum"`);
    await queryRunner.query(`DROP TYPE "appointments_origin_enum"`);
  }
}
