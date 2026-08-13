import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catálogo de motocicletas.
 *
 * El alta de unidades encadena marca → modelo → versión → color, y todo eso
 * cuelga de `global_models`. Como el catálogo solo traía automóviles, al elegir
 * la categoría "Moto" no aparecía ninguna marca: no es que fallara, es que no
 * había de dónde sacarlas.
 *
 * Se siembran modelos reales del mercado mexicano para que el flujo se pueda
 * recorrer completo. Es idempotente: si el tenant ya dio de alta una marca o
 * un modelo con el mismo nombre, no se duplica.
 */
export class CatalogoMotos1787100000000 implements MigrationInterface {
  name = 'CatalogoMotos1787100000000';

  /** marca → [modelo, versión, cilindrada] */
  private readonly catalogo: Record<string, [string, string, number][]> = {
    Italika: [
      ['FT150', 'Estándar', 150],
      ['DM200', 'Doble propósito', 200],
      ['Vort-X 300', 'Deportiva', 300],
    ],
    Honda: [
      ['Cargo 150', 'Trabajo', 150],
      ['XR150L', 'Doble propósito', 150],
      ['CB500F', 'Naked', 471],
    ],
    Yamaha: [
      ['FZ-S FI', 'Naked', 149],
      ['MT-03', 'Naked', 321],
    ],
    Suzuki: [
      ['GN125', 'Estándar', 124],
      ['Gixxer 250', 'Naked', 249],
    ],
    Bajaj: [
      ['Boxer CT100', 'Trabajo', 100],
      ['Pulsar NS200', 'Deportiva', 199],
    ],
  };

  /** Colores de calle; el interior no aplica a una moto. */
  private readonly colores = ['Negro', 'Rojo', 'Blanco', 'Azul'];

  public async up(q: QueryRunner): Promise<void> {
    const tipo = await q.query<{ id: string }[]>(
      `SELECT id FROM vehicle_types WHERE code = 'MOTORCYCLE' LIMIT 1`,
    );
    if (!tipo.length) {
      // Sin el tipo de vehículo no hay dónde colgar los modelos; se sale sin
      // romper la migración porque el catálogo de tipos es responsabilidad
      // de otra siembra.
      return;
    }
    const vehicleTypeId = tipo[0].id;
    const anio = new Date().getFullYear();

    for (const [marca, modelos] of Object.entries(this.catalogo)) {
      await q.query(
        `INSERT INTO global_brands ("name")
         SELECT $1::varchar
          WHERE NOT EXISTS (
            SELECT 1 FROM global_brands WHERE lower("name") = lower($1::varchar))`,
        [marca],
      );
      const [{ id: brandId }] = await q.query<{ id: string }[]>(
        `SELECT id FROM global_brands WHERE lower("name") = lower($1) LIMIT 1`,
        [marca],
      );

      for (const [modelo, version, cc] of modelos) {
        await q.query(
          `INSERT INTO global_models
             ("model","year","version","displacement","vehicle_type_id","brand_id","is_active")
           SELECT $1::varchar, $2::int, $3::varchar, $4::int, $5::uuid, $6::uuid, true
            WHERE NOT EXISTS (
              SELECT 1 FROM global_models
               WHERE brand_id = $6::uuid
                 AND lower("model") = lower($1::varchar)
                 AND "year" = $2::int)`,
          [modelo, anio, version, cc, vehicleTypeId, brandId],
        );
        // El catálogo del alta de unidades encadena por `vehicle_models`,
        // que es una tabla distinta de `global_models`: la primera alimenta
        // versiones y colores, la segunda la lista de marcas por tipo.
        await q.query(
          `INSERT INTO vehicle_models ("brand_id","name")
           SELECT $1::uuid, $2::varchar
            WHERE NOT EXISTS (
              SELECT 1 FROM vehicle_models
               WHERE brand_id = $1::uuid AND lower("name") = lower($2::varchar))`,
          [brandId, modelo],
        );
        const [{ id: modelId }] = await q.query<{ id: string }[]>(
          `SELECT id FROM vehicle_models
            WHERE brand_id = $1::uuid AND lower("name") = lower($2::varchar) LIMIT 1`,
          [brandId, modelo],
        );

        await q.query(
          `INSERT INTO vehicle_versions ("brand_id","model_id","year","name")
           SELECT $1::uuid, $2::uuid, $3::int, $4::varchar
            WHERE NOT EXISTS (
              SELECT 1 FROM vehicle_versions
               WHERE model_id = $2::uuid AND lower("name") = lower($4::varchar))`,
          [brandId, modelId, anio, version],
        );
        const [{ id: versionId }] = await q.query<{ id: string }[]>(
          `SELECT id FROM vehicle_versions WHERE model_id = $1::uuid LIMIT 1`,
          [modelId],
        );

        for (const color of this.colores) {
          await q.query(
            `INSERT INTO vehicle_colors ("brand_id","model_id","version_id","name","color_type")
             SELECT $1::uuid, $2::uuid, $3::uuid, $4::varchar, 'EXTERIOR'
              WHERE NOT EXISTS (
                SELECT 1 FROM vehicle_colors
                 WHERE version_id = $3::uuid
                   AND lower("name") = lower($4::varchar)
                   AND "color_type" = 'EXTERIOR')`,
            [brandId, modelId, versionId, color],
          );
        }
      }
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    // Solo se retira lo sembrado aquí; las marcas se dejan porque el tenant
    // pudo colgar sus propias unidades de ellas.
    const modelos = Object.values(this.catalogo)
      .flat()
      .map(([m]) => m);
    const enMinuscula = modelos.map((m) => m.toLowerCase());
    await q.query(
      `DELETE FROM vehicle_colors WHERE model_id IN (
         SELECT id FROM vehicle_models WHERE lower("name") = ANY($1))`,
      [enMinuscula],
    );
    await q.query(
      `DELETE FROM vehicle_versions WHERE model_id IN (
         SELECT id FROM vehicle_models WHERE lower("name") = ANY($1))`,
      [enMinuscula],
    );
    await q.query(`DELETE FROM vehicle_models WHERE lower("name") = ANY($1)`, [
      enMinuscula,
    ]);
    await q.query(`DELETE FROM global_models WHERE lower("model") = ANY($1)`, [
      modelos.map((m) => m.toLowerCase()),
    ]);
  }
}
