import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWarranties1773643900000 implements MigrationInterface {
  name = 'AddWarranties1773643900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "warranties_type_enum" AS ENUM (
        'UNIT', 'PART', 'SERVICE'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "warranties_status_enum" AS ENUM (
        'OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "warranties" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "unit_sale_id" uuid,
        "service_order_id" uuid,
        "client_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "authorizer_id" uuid,
        "type" "warranties_type_enum" NOT NULL,
        "description" text NOT NULL,
        "status" "warranties_status_enum" NOT NULL,
        "resolution" text,
        "new_service_order_id" uuid,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_warranties" PRIMARY KEY ("id"),
        CONSTRAINT "FK_warranties_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_warranties_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_warranties_unit_sale" FOREIGN KEY ("unit_sale_id") REFERENCES "unit_sales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_warranties_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_warranties_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_warranties_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "customer_vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_warranties_authorizer" FOREIGN KEY ("authorizer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_warranties_new_service_order" FOREIGN KEY ("new_service_order_id") REFERENCES "service_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_warranties_tenant_id" ON "warranties" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warranties_branch_id" ON "warranties" ("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warranties_status" ON "warranties" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warranties_client_id" ON "warranties" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_warranties_created_at" ON "warranties" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_warranties_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_warranties_client_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_warranties_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_warranties_branch_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_warranties_tenant_id"`);
    await queryRunner.query(`DROP TABLE "warranties"`);

    await queryRunner.query(`DROP TYPE "warranties_status_enum"`);
    await queryRunner.query(`DROP TYPE "warranties_type_enum"`);
  }
}
