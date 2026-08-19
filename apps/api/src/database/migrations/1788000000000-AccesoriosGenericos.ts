import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Accesorios que valen para cualquier unidad.
 *
 * La compatibilidad se lleva en una tabla de modelos y el catálogo la
 * consultaba con un `INNER JOIN`: un accesorio sin modelos —unas barras porta
 * equipaje que sirven para todo, un juego de tapetes universales— no aparecía
 * nunca al vender. Estaba dado de alta y era invisible.
 *
 * Se marca a propósito con `is_universal` en vez de tomar "sin modelos" como
 * genérico: sin filas puede significar también que nadie las ha capturado
 * todavía, y adivinar cuál de las dos cosas es acaba ofreciendo un accesorio
 * que no monta.
 *
 * De paso, la categoría: un catálogo de accesorios se recorre por familia
 * —tapetes, barras, cascos— y sin ella la pantalla es una lista plana.
 */
export class AccesoriosGenericos1788000000000 implements MigrationInterface {
  name = 'AccesoriosGenericos1788000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "unit_accessories"
        ADD "is_universal" boolean NOT NULL DEFAULT false,
        ADD "category" varchar(100)`);

    // Los que ya existan sin ninguna compatibilidad se marcan universales:
    // es la única lectura que no los deja peor de como estaban, que era
    // invisibles.
    await q.query(`
      UPDATE "unit_accessories" a
         SET "is_universal" = true
       WHERE NOT EXISTS (
         SELECT 1 FROM "unit_accessory_compatibilities" c
          WHERE c."accessory_id" = a."id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "unit_accessories"
        DROP COLUMN "category",
        DROP COLUMN "is_universal"`);
  }
}
