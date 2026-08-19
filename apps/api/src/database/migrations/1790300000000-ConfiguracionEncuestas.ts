import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Configuración de encuestas por área (SERVICE / SALES): preguntas editables
 * (puntaje o texto), mensaje de introducción y de agradecimiento. Una config
 * por tenant y área.
 */
export class ConfiguracionEncuestas1790300000000 implements MigrationInterface {
  name = 'ConfiguracionEncuestas1790300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "survey_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "area" varchar(20) NOT NULL,
        "intro" text,
        "thanks" text,
        "questions" jsonb NOT NULL DEFAULT '[]',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_survey_configs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_survey_area" CHECK ("area" IN ('SERVICE','SALES'))
      )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_survey_config_area" ON "survey_configs" ("tenant_id", "area")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "survey_configs"`);
  }
}
