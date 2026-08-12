import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 1 MVP:
 * - tracking_token en service_orders (link público de seguimiento)
 * - tabla service_surveys (encuesta post-entrega)
 * - enabled_modules en tenants (módulos activables por cliente SaaS)
 */
export class Fase1MvpControls1786600000000 implements MigrationInterface {
  name = 'Fase1MvpControls1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Tracking público ─────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "service_orders" ADD "tracking_token" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_service_orders_tracking_token" ON "service_orders" ("tracking_token")`,
    );

    // ── Encuesta de servicio ─────────────────────────
    await queryRunner.query(`
      CREATE TABLE "service_surveys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "service_order_id" uuid NOT NULL,
        "token" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "score" int,
        "comment" text,
        "sent_at" TIMESTAMP,
        "answered_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_surveys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_service_surveys_token" UNIQUE ("token"),
        CONSTRAINT "UQ_service_surveys_order" UNIQUE ("service_order_id"),
        CONSTRAINT "FK_service_surveys_order" FOREIGN KEY ("service_order_id")
          REFERENCES "service_orders"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_service_surveys_tenant" ON "service_surveys" ("tenant_id")`,
    );

    // ── Módulos por tenant ───────────────────────────
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "enabled_modules" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "enabled_modules"`,
    );
    await queryRunner.query(`DROP TABLE "service_surveys"`);
    await queryRunner.query(
      `DROP INDEX "IDX_service_orders_tracking_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP COLUMN "tracking_token"`,
    );
  }
}
