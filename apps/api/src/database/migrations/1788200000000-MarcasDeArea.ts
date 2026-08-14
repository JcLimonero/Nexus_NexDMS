import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marcas que encierran una zona, no solo un punto.
 *
 * Un punto sirve para un rayón, que ocurre en un sitio concreto. No sirve
 * para lo que ocupa una región —un cuarto de la tapa raspado, el faro
 * estrellado—: quien firma la recepción no puede saber si el punto señala
 * un golpe del tamaño de una moneda o de la mano entera, y esa diferencia
 * es justo la que se discute a la entrega.
 *
 * El radio va relativo al ANCHO de la imagen, no al alto: así el círculo se
 * dibuja redondo en cualquier pantalla. Referirlo a los dos ejes lo
 * convertiría en un óvalo distinto en cada tableta.
 *
 * Las marcas que ya existen quedan como punto, que es lo que eran.
 */
export class MarcasDeArea1788200000000 implements MigrationInterface {
  name = 'MarcasDeArea1788200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "reception_photo_marks"
        ADD "shape" varchar(10) NOT NULL DEFAULT 'POINT'`);
    await q.query(`
      ALTER TABLE "reception_photo_marks"
        ADD "radius" numeric(5,4)`);
    // El radio solo tiene sentido en un círculo, y un círculo sin radio no se
    // puede dibujar: se exige aquí para que ninguna ruta futura guarde una
    // marca que la pantalla no sepa pintar.
    await q.query(`
      ALTER TABLE "reception_photo_marks"
        ADD CONSTRAINT "CHK_marca_radio"
        CHECK (
          ("shape" = 'POINT'  AND "radius" IS NULL) OR
          ("shape" = 'CIRCLE' AND "radius" > 0 AND "radius" <= 1)
        )`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "reception_photo_marks"
        DROP CONSTRAINT "CHK_marca_radio"`);
    await q.query(
      `ALTER TABLE "reception_photo_marks" DROP COLUMN "radius"`,
    );
    await q.query(`ALTER TABLE "reception_photo_marks" DROP COLUMN "shape"`);
  }
}
