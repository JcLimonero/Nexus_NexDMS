import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceOrders1773643800000 implements MigrationInterface {
  name = 'AddServiceOrders1773643800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_order_folio_seq" (
        "tenant_id" uuid NOT NULL,
        "year" integer NOT NULL,
        "last_value" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_service_order_folio_seq" PRIMARY KEY ("tenant_id", "year")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "service_orders_status_enum" AS ENUM (
        'RECEIVED', 'DIAGNOSIS', 'IN_PROGRESS', 'WAITING_PARTS',
        'READY', 'DELIVERED', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "service_orders_payment_method_enum" AS ENUM (
        'CASH', 'CARD', 'TRANSFER', 'MIXED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "service_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "owner_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "reception_contact_id" uuid,
        "reception_name" varchar(200),
        "reception_phone" varchar(20),
        "user_id" uuid NOT NULL,
        "mechanic_id" uuid,
        "appointment_id" uuid,
        "quotation_id" uuid,
        "folio" varchar(50) NOT NULL,
        "status" "service_orders_status_enum" NOT NULL,
        "reported_fault" text NOT NULL,
        "diagnosis" text,
        "work_performed" text,
        "km_in" integer NOT NULL,
        "km_out" integer,
        "labor_cost" decimal(12,2) NOT NULL DEFAULT 0,
        "parts_cost" decimal(12,2) NOT NULL DEFAULT 0,
        "discount" decimal(12,2) NOT NULL DEFAULT 0,
        "total" decimal(12,2) NOT NULL,
        "payment_method" "service_orders_payment_method_enum",
        "cfdi_uuid" varchar(100),
        "received_at" TIMESTAMP NOT NULL,
        "promised_at" TIMESTAMP,
        "ready_at" TIMESTAMP,
        "delivered_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_orders_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_service_orders_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_service_orders_owner" FOREIGN KEY ("owner_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_service_orders_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "customer_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_service_orders_reception_contact" FOREIGN KEY ("reception_contact_id") REFERENCES "contacts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_service_orders_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_service_orders_mechanic" FOREIGN KEY ("mechanic_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_service_orders_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_service_orders_quotation" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_tenant_id" ON "service_orders" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_branch_id" ON "service_orders" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_status" ON "service_orders" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_folio" ON "service_orders" ("folio")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_created_at" ON "service_orders" ("created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "reception_checklists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "fuel_level" integer NOT NULL,
        "km_in" integer NOT NULL,
        "has_spare_tire" boolean NOT NULL DEFAULT false,
        "has_tools" boolean NOT NULL DEFAULT false,
        "has_documents" boolean NOT NULL DEFAULT false,
        "has_mats" boolean NOT NULL DEFAULT false,
        "observations" text,
        "damage_description" text,
        "client_signature_key" varchar(500),
        "photos_keys" text[],
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reception_checklists" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reception_checklists_service_order" UNIQUE ("service_order_id"),
        CONSTRAINT "FK_reception_checklists_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_reception_checklists_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "service_order_parts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" decimal(12,2) NOT NULL,
        "subtotal" decimal(12,2) NOT NULL,
        CONSTRAINT "PK_service_order_parts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_order_parts_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_service_order_parts_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_parts_service_order_id" ON "service_order_parts" ("service_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_parts_part_id" ON "service_order_parts" ("part_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "service_order_times" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "mechanic_id" uuid NOT NULL,
        "started_at" TIMESTAMP NOT NULL,
        "ended_at" TIMESTAMP,
        "minutes" integer NOT NULL DEFAULT 0,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_order_times" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_order_times_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_service_order_times_mechanic" FOREIGN KEY ("mechanic_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_times_service_order_id" ON "service_order_times" ("service_order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_order_times_service_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "service_order_times"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_order_parts_part_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_order_parts_service_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "service_order_parts"`);

    await queryRunner.query(`DROP TABLE "reception_checklists"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_orders_created_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_service_orders_folio"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_service_orders_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_orders_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_orders_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "service_orders"`);

    await queryRunner.query(`DROP TYPE "service_orders_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "service_orders_status_enum"`);

    await queryRunner.query(`DROP TABLE "service_order_folio_seq"`);
  }
}
