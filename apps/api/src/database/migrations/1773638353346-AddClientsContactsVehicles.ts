import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientsContactsVehicles1773638353346 implements MigrationInterface {
  name = 'AddClientsContactsVehicles1773638353346';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP CONSTRAINT "FK_contacts_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP CONSTRAINT "FK_contacts_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_clients_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" DROP CONSTRAINT "FK_customer_vehicles_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" DROP CONSTRAINT "FK_customer_vehicles_tenant"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_contacts_tenant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_contacts_client_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_contacts_phone"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_tenant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_phone"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_rfc"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_customer_vehicles_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_customer_vehicles_owner_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_customer_vehicles_vin"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_customer_vehicles_plate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "tax_rate" SET DEFAULT '0.16'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_84cae51c485079bdd8cdf1d828" ON "contacts" ("phone") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_72d1013c43a0198e905290831e" ON "contacts" ("client_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_71ec7d68cfafa5f3d93c959b80" ON "contacts" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d635605bd9c25582e73a8f0e0c" ON "clients" ("tenant_id", "client_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_df6ff4050837617743af98497f" ON "clients" ("tenant_id", "rfc") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b8cb5e0d968c9498a3295183f3" ON "clients" ("tenant_id", "phone") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e7d8b637725986e7b5fa774a3f" ON "clients" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b047d5e3323ee578bd513067a5" ON "customer_vehicles" ("plate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_834b91cea6a8aa154fcb259528" ON "customer_vehicles" ("vin") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ae531ba0063b63b5fc4b442065" ON "customer_vehicles" ("owner_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a51d0e0a66091265fb51a56420" ON "customer_vehicles" ("tenant_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a51d0e0a66091265fb51a56420"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ae531ba0063b63b5fc4b442065"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_834b91cea6a8aa154fcb259528"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b047d5e3323ee578bd513067a5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e7d8b637725986e7b5fa774a3f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b8cb5e0d968c9498a3295183f3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_df6ff4050837617743af98497f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d635605bd9c25582e73a8f0e0c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_71ec7d68cfafa5f3d93c959b80"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_72d1013c43a0198e905290831e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_84cae51c485079bdd8cdf1d828"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "tax_rate" SET DEFAULT 0.16`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_vehicles_plate" ON "customer_vehicles" ("plate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_vehicles_vin" ON "customer_vehicles" ("vin") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_vehicles_owner_id" ON "customer_vehicles" ("owner_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_vehicles_tenant_id" ON "customer_vehicles" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_rfc" ON "clients" ("tenant_id", "rfc") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_phone" ON "clients" ("tenant_id", "phone") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_tenant_id" ON "clients" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contacts_phone" ON "contacts" ("client_id", "phone") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contacts_client_id" ON "contacts" ("client_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contacts_tenant_id" ON "contacts" ("tenant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" ADD CONSTRAINT "FK_customer_vehicles_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vehicles" ADD CONSTRAINT "FK_customer_vehicles_owner" FOREIGN KEY ("owner_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD CONSTRAINT "FK_contacts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD CONSTRAINT "FK_contacts_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
