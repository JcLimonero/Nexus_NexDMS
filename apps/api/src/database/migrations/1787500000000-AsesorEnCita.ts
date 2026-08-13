import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Asesor de servicio en la cita, separado del técnico.
 *
 * Son dos personas y dos momentos distintos: el asesor atiende al cliente y
 * recibe la unidad; el técnico la repara. La cita solo guardaba `mechanic_id`,
 * así que no había forma de saber quién iba a recibir ni de repartir la carga
 * del mostrador — que es lo que se satura en la mañana, no el taller.
 */
export class AsesorEnCita1787500000000 implements MigrationInterface {
  name = 'AsesorEnCita1787500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "appointments" ADD "advisor_id" uuid`);
    await q.query(
      `CREATE INDEX "IDX_appointments_advisor" ON "appointments" ("advisor_id", "scheduled_at")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "IDX_appointments_advisor"`);
    await q.query(`ALTER TABLE "appointments" DROP COLUMN "advisor_id"`);
  }
}
