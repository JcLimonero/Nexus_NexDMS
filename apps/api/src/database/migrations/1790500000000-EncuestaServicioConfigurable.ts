import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migra la encuesta de servicio al modelo configurable: preguntas (snapshot),
 * respuestas por pregunta, y textos de intro/agradecimiento. Las encuestas
 * viejas (sin preguntas) siguen funcionando con el puntaje único.
 */
export class EncuestaServicioConfigurable1790500000000
  implements MigrationInterface
{
  name = 'EncuestaServicioConfigurable1790500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "service_surveys" ADD COLUMN "questions" jsonb NOT NULL DEFAULT '[]'`,
    );
    await q.query(
      `ALTER TABLE "service_surveys" ADD COLUMN "answers" jsonb NOT NULL DEFAULT '{}'`,
    );
    await q.query(`ALTER TABLE "service_surveys" ADD COLUMN "intro" text`);
    await q.query(`ALTER TABLE "service_surveys" ADD COLUMN "thanks" text`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "service_surveys" DROP COLUMN "thanks"`);
    await q.query(`ALTER TABLE "service_surveys" DROP COLUMN "intro"`);
    await q.query(`ALTER TABLE "service_surveys" DROP COLUMN "answers"`);
    await q.query(`ALTER TABLE "service_surveys" DROP COLUMN "questions"`);
  }
}
