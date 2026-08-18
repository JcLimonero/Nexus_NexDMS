import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Encuestas post-venta: instancia por venta con las preguntas configuradas
 * (snapshot), respondida por el cliente vía token público.
 */
export class EncuestasDeVenta1790400000000 implements MigrationInterface {
  name = 'EncuestasDeVenta1790400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "sale_surveys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "reference_label" varchar(120),
        "client_name" varchar(200),
        "token" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "intro" text,
        "thanks" text,
        "questions" jsonb NOT NULL DEFAULT '[]',
        "answers" jsonb NOT NULL DEFAULT '{}',
        "score" int,
        "sent_at" TIMESTAMP,
        "answered_at" TIMESTAMP,
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_surveys" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_sale_survey_token" ON "sale_surveys" ("token")`,
    );
    await q.query(
      `CREATE INDEX "IDX_sale_survey_tenant" ON "sale_surveys" ("tenant_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "sale_surveys"`);
  }
}
