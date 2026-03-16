import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMechanicChecklistItems1773647400000 implements MigrationInterface {
  name = 'AddMechanicChecklistItems1773647400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "mechanic_checklist_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "code" varchar(50) NOT NULL,
        "name" varchar(200) NOT NULL,
        "description" text NULL,
        "is_required" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_mechanic_checklist_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_mechanic_checklist_items_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_mechanic_checklist_items_tenant" ON "mechanic_checklist_items" ("tenant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_mechanic_checklist_items_tenant"`,
    );
    await queryRunner.query(`DROP TABLE "mechanic_checklist_items"`);
  }
}
