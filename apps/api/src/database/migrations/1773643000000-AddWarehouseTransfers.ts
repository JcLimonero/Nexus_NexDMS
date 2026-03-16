import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWarehouseTransfers1773643000000 implements MigrationInterface {
  name = 'AddWarehouseTransfers1773643000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "transfer_folio_seq" (
        "tenant_id" uuid NOT NULL,
        "year" integer NOT NULL,
        "last_value" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_transfer_folio_seq" PRIMARY KEY ("tenant_id", "year")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "warehouse_transfers_type_enum" AS ENUM (
        'INTRA_BRAND', 'INTER_BRAND'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "warehouse_transfers_status_enum" AS ENUM (
        'PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "warehouse_transfers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "origin_branch_id" uuid NOT NULL,
        "destination_branch_id" uuid NOT NULL,
        "approver_id" uuid,
        "folio" varchar(50) NOT NULL,
        "type" "warehouse_transfers_type_enum" NOT NULL,
        "status" "warehouse_transfers_status_enum" NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_warehouse_transfers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_warehouse_transfers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_warehouse_transfers_origin" FOREIGN KEY ("origin_branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_warehouse_transfers_destination" FOREIGN KEY ("destination_branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_warehouse_transfers_approver" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_transfers_tenant_id" ON "warehouse_transfers" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_transfers_origin_branch_id" ON "warehouse_transfers" ("origin_branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_transfers_destination_branch_id" ON "warehouse_transfers" ("destination_branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_transfers_folio" ON "warehouse_transfers" ("folio")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_transfers_status" ON "warehouse_transfers" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "warehouse_transfer_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "warehouse_transfer_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        CONSTRAINT "PK_warehouse_transfer_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_warehouse_transfer_items_transfer" FOREIGN KEY ("warehouse_transfer_id") REFERENCES "warehouse_transfers"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_warehouse_transfer_items_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_transfer_items_transfer_id" ON "warehouse_transfer_items" ("warehouse_transfer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warehouse_transfer_items_part_id" ON "warehouse_transfer_items" ("part_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_warehouse_transfer_items_part_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_warehouse_transfer_items_transfer_id"`,
    );
    await queryRunner.query(`DROP TABLE "warehouse_transfer_items"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_warehouse_transfers_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_warehouse_transfers_folio"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_warehouse_transfers_destination_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_warehouse_transfers_origin_branch_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_warehouse_transfers_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "warehouse_transfers"`);
    await queryRunner.query(`DROP TYPE "warehouse_transfers_status_enum"`);
    await queryRunner.query(`DROP TYPE "warehouse_transfers_type_enum"`);

    await queryRunner.query(`DROP TABLE "transfer_folio_seq"`);
  }
}
