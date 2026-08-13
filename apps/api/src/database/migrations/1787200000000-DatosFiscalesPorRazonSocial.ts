import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Los datos fiscales pasan de la sucursal a la razón social.
 *
 * Quien tiene RFC, régimen y domicilio fiscal ante el SAT es la persona moral,
 * no el local donde se atiende. Tenerlos en `branches` obligaba a repetir los
 * mismos datos en cada sucursal de una misma razón social y abría la puerta a
 * que se contradijeran entre sí.
 *
 * `cfdi_serie` se queda en la sucursal a propósito: la serie de folios
 * identifica el punto de emisión, y es normal que cada sucursal lleve la suya
 * aunque todas facturen con el mismo RFC.
 */
export class DatosFiscalesPorRazonSocial1787200000000
  implements MigrationInterface
{
  name = 'DatosFiscalesPorRazonSocial1787200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "legal_entities"
        ADD "rfc" varchar(13),
        ADD "tax_regime" varchar(10),
        ADD "tax_postal_code" varchar(10),
        ADD "facturaapi_org_id" varchar(100)`);

    // Se arrastra lo que ya tenían las sucursales. Si una razón social tiene
    // varias, gana la principal; si no hay principal, la más antigua.
    await q.query(`
      UPDATE "legal_entities" le
         SET "rfc" = b."rfc",
             "tax_regime" = b."tax_regime",
             "tax_postal_code" = b."tax_postal_code",
             "facturaapi_org_id" = b."facturaapi_org_id"
        FROM (
          SELECT DISTINCT ON (legal_entity_id)
                 legal_entity_id, rfc, tax_regime, tax_postal_code, facturaapi_org_id
            FROM "branches"
           WHERE legal_entity_id IS NOT NULL
           ORDER BY legal_entity_id, is_primary DESC, created_at ASC
        ) b
       WHERE b.legal_entity_id = le.id`);

    await q.query(`
      ALTER TABLE "branches"
        DROP COLUMN "rfc",
        DROP COLUMN "legal_name",
        DROP COLUMN "tax_regime",
        DROP COLUMN "tax_postal_code",
        DROP COLUMN "facturaapi_org_id"`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "branches"
        ADD "rfc" varchar(13),
        ADD "legal_name" varchar(300),
        ADD "tax_regime" varchar(10),
        ADD "tax_postal_code" varchar(10),
        ADD "facturaapi_org_id" varchar(100)`);

    await q.query(`
      UPDATE "branches" b
         SET "rfc" = le."rfc",
             "legal_name" = le."name",
             "tax_regime" = le."tax_regime",
             "tax_postal_code" = le."tax_postal_code",
             "facturaapi_org_id" = le."facturaapi_org_id"
        FROM "legal_entities" le
       WHERE le.id = b.legal_entity_id`);

    await q.query(`
      ALTER TABLE "legal_entities"
        DROP COLUMN "facturaapi_org_id",
        DROP COLUMN "tax_postal_code",
        DROP COLUMN "tax_regime",
        DROP COLUMN "rfc"`);
  }
}
