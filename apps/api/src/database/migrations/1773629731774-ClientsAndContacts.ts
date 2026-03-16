import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClientsAndContacts1773629731774 implements MigrationInterface {
  name = 'ClientsAndContacts1773629731774';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."clients_client_type_enum" AS ENUM('PUBLIC', 'WHOLESALE', 'COMPANY')`,
    );
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_type" "public"."clients_client_type_enum" NOT NULL,
        "is_company" boolean NOT NULL DEFAULT false,
        "name" character varying(200) NOT NULL,
        "last_name" character varying(200),
        "legal_name" character varying(300),
        "rfc" character varying(13),
        "curp" character varying(18),
        "tax_regime" character varying(10),
        "tax_postal_code" character varying(10),
        "phone" character varying(20) NOT NULL,
        "phone_alt" character varying(20),
        "email" character varying(300),
        "address" character varying(500),
        "city" character varying(100),
        "state" character varying(100),
        "fixed_discount" numeric(5,2) NOT NULL DEFAULT '0',
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_clients_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_clients_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_tenant_id" ON "clients" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_phone" ON "clients" ("tenant_id", "phone")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_rfc" ON "clients" ("tenant_id", "rfc")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_client_type" ON "clients" ("tenant_id", "client_type")`,
    );

    await queryRunner.query(`
      CREATE TABLE "contacts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "last_name" character varying(200),
        "phone" character varying(20) NOT NULL,
        "email" character varying(300),
        "position" character varying(200),
        "department" character varying(200),
        "is_authorized" boolean NOT NULL DEFAULT true,
        "notes" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contacts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contacts_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contacts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_contacts_tenant_id" ON "contacts" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contacts_client_id" ON "contacts" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contacts_phone" ON "contacts" ("client_id", "phone")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_contacts_phone"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_contacts_client_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_contacts_tenant_id"`);
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_client_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_rfc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_phone"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_tenant_id"`);
    await queryRunner.query(`DROP TABLE "clients"`);
    await queryRunner.query(`DROP TYPE "public"."clients_client_type_enum"`);
  }
}
