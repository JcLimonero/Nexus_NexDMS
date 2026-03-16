import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceOrderFindings1773647300000 implements MigrationInterface {
  name = 'AddServiceOrderFindings1773647300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "service_order_findings_media_type_enum" AS ENUM ('PHOTO', 'VIDEO')
    `);
    await queryRunner.query(`
      CREATE TABLE "service_order_findings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "description" text NOT NULL,
        "requires_quotation" boolean NOT NULL DEFAULT true,
        "media_type" "service_order_findings_media_type_enum" NOT NULL,
        "media_key" varchar(500) NOT NULL,
        "client_notified_at" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_order_findings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_order_findings_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_service_order_findings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_findings_service_order" ON "service_order_findings" ("service_order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_service_order_findings_service_order"`,
    );
    await queryRunner.query(`DROP TABLE "service_order_findings"`);
    await queryRunner.query(
      `DROP TYPE "service_order_findings_media_type_enum"`,
    );
  }
}
