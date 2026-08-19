import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La regla de documentos discrimina por CATEGORÍA de vehículo, no por tipo.
 *
 * El tipo (moto, auto, SUV, minivan, camión…) es demasiado fino para exigir
 * papeles: lo que cambia los requisitos es la categoría —Moto o Auto—, que es
 * como el concesionario piensa la línea. Se renombra el eje; las reglas
 * sembradas lo tenían en NULL ("cualquiera"), así que no hay dato que traducir.
 */
export class ReglaPorCategoria1788500000000 implements MigrationInterface {
  name = 'ReglaPorCategoria1788500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "sale_document_rules" RENAME COLUMN "vehicle_type" TO "vehicle_category"`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "sale_document_rules" RENAME COLUMN "vehicle_category" TO "vehicle_type"`,
    );
  }
}
