import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cuánto se espera a un cliente antes de dar la cita por perdida.
 *
 * Estaba fijo en media hora dentro del trabajo programado. No sirve igual
 * para todos: un taller de ciudad con tráfico da más margen que uno de
 * carretera, y una sucursal con agenda apretada no puede permitirse esperar
 * porque el hueco se pierde.
 *
 * `0` apaga la regla en esa sucursal: hay talleres que prefieren cerrar la
 * cita a mano y no que el sistema decida por ellos.
 */
export class ToleranciaNoShow1788100000000 implements MigrationInterface {
  name = 'ToleranciaNoShow1788100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "branches"
        ADD "no_show_tolerance_min" int NOT NULL DEFAULT 30`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "branches" DROP COLUMN "no_show_tolerance_min"`,
    );
  }
}
