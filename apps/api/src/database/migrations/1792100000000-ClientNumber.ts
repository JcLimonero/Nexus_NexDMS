import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Códigos legibles de documentos por empresa.
 *
 * - Cada empresa (tenant) tiene un prefijo de 3 letras (`code_prefix`), fijo
 *   una vez creada. Para las que ya existen se siembra con las iniciales de su
 *   nombre.
 * - Los clientes reciben un consecutivo por empresa y un código legible
 *   `PREFIJO + C + consecutivo(8)` → p. ej. `APGC00000001`.
 * - `document_code_seq` es el contador genérico por (empresa, tipo de objeto),
 *   reutilizable después para órdenes, pedidos, etc.
 *
 * El GUID sigue siendo la identidad real; el código es solo para leer y buscar.
 */
export class ClientNumber1792100000000 implements MigrationInterface {
  name = 'ClientNumber1792100000000';

  public async up(q: QueryRunner): Promise<void> {
    // 1) Prefijo de empresa (3 letras). Se siembra de las iniciales del nombre.
    await q.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "code_prefix" char(3)`,
    );
    // Sugerencia de prefijo (igual que el helper del backend): si hay 3+
    // iniciales de palabras significativas se usan (Autos Premium Guadalajara →
    // APG); si no, las primeras 3 letras del nombre (Total Dealer → TOT).
    await q.query(`
      UPDATE "tenants" t SET "code_prefix" = sub.pref
      FROM (
        SELECT id, RPAD(
          CASE WHEN length(ini) >= 3 THEN LEFT(ini, 3) ELSE LEFT(letras, 3) END,
          3, 'X') AS pref
        FROM (
          SELECT id,
            COALESCE((
              SELECT string_agg(LEFT(w, 1), '' ORDER BY ord)
              FROM regexp_split_to_table(
                     UPPER(TRANSLATE(name,
                       'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ',
                       'AEIOUAEIOUAEIOUAEIOUN')), '\\s+')
                   WITH ORDINALITY AS x(raw, ord)
              CROSS JOIN LATERAL (
                SELECT regexp_replace(raw, '[^A-Z]', '', 'g') AS w
              ) y
              WHERE w <> '' AND w NOT IN
                ('DE','DEL','LA','LAS','EL','LOS','Y','SA','CV','SAPI','SC','SRL')
            ), '') AS ini,
            regexp_replace(UPPER(TRANSLATE(name,
              'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ',
              'AEIOUAEIOUAEIOUAEIOUN')), '[^A-Z]', '', 'g') AS letras
          FROM "tenants"
        ) z
      ) sub
      WHERE t.id = sub.id AND t.code_prefix IS NULL`);

    // 1b) De-duplicación: dos empresas no pueden compartir prefijo (sus códigos
    // se verían iguales). A la empresa más antigua se le respeta; a las demás
    // que colisionan se les cambia el 3er carácter por un dígito (AUT→AU1, AU2…).
    await q.query(`
      WITH ranked AS (
        SELECT id, code_prefix,
          ROW_NUMBER() OVER (
            PARTITION BY code_prefix ORDER BY created_at, id
          ) AS rn
        FROM "tenants" WHERE code_prefix IS NOT NULL
      )
      UPDATE "tenants" t
      SET code_prefix = LEFT(r.code_prefix, 2) || (r.rn - 1)::text
      FROM ranked r
      WHERE t.id = r.id AND r.rn > 1`);

    // 2) Contador genérico por (empresa, tipo de objeto).
    await q.query(`
      CREATE TABLE IF NOT EXISTS "document_code_seq" (
        "tenant_id" uuid NOT NULL,
        "object_code" varchar(3) NOT NULL,
        "last_value" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_document_code_seq" PRIMARY KEY ("tenant_id", "object_code")
      )`);

    // 3) Columnas del cliente: consecutivo crudo + código legible.
    await q.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "client_number" int`,
    );
    await q.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "client_code" varchar(24)`,
    );

    // 4) Numera los clientes existentes por antigüedad, dentro de cada empresa.
    await q.query(`
      UPDATE "clients" c SET "client_number" = sub.rn
      FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY tenant_id ORDER BY created_at, id
        ) AS rn
        FROM "clients"
      ) sub
      WHERE c.id = sub.id AND c.client_number IS NULL`);

    // 5) Arma el código legible de los existentes con el prefijo de su empresa.
    await q.query(`
      UPDATE "clients" c
      SET "client_code" = t.code_prefix || 'C' || LPAD(c.client_number::text, 8, '0')
      FROM "tenants" t
      WHERE c.tenant_id = t.id
        AND c.client_number IS NOT NULL
        AND c.client_code IS NULL`);

    // 6) Siembra el contador de clientes ('C') con el máximo por empresa.
    await q.query(`
      INSERT INTO "document_code_seq" (tenant_id, object_code, last_value)
      SELECT tenant_id, 'C', COALESCE(MAX(client_number), 0)
      FROM "clients" GROUP BY tenant_id
      ON CONFLICT (tenant_id, object_code) DO UPDATE
        SET last_value = GREATEST(document_code_seq.last_value, EXCLUDED.last_value)`);

    // 7) Unicidad del código y del consecutivo por empresa.
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_clients_tenant_number" ON "clients" ("tenant_id", "client_number") WHERE "client_number" IS NOT NULL`,
    );
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_clients_code" ON "clients" ("tenant_id", "client_code") WHERE "client_code" IS NOT NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "UQ_clients_code"`);
    await q.query(`DROP INDEX IF EXISTS "UQ_clients_tenant_number"`);
    await q.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "client_code"`);
    await q.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "client_number"`);
    await q.query(`DROP TABLE IF EXISTS "document_code_seq"`);
    await q.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "code_prefix"`);
  }
}
