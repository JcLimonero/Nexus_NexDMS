import { config } from 'dotenv';
import { join } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

// Carga apps/api/.env (relativo a src/database/seeds).
config({ path: join(__dirname, '..', '..', '..', '.env') });

/**
 * Corre un archivo .sql (de esta carpeta) contra la BD de DATABASE_URL, dentro
 * de una transacción (atómico: si algo falla, no queda data parcial).
 *
 *   ts-node -r tsconfig-paths/register src/database/seeds/run-file.ts <archivo.sql>
 *
 * Prod (Render):
 *   NODE_ENV=production DATABASE_URL="<external-url>" \
 *     ts-node -r tsconfig-paths/register src/database/seeds/run-file.ts seed-taller-demo.sql
 *
 * Nota: el propio .sql ya trae BEGIN/COMMIT; aquí no se abre otra transacción.
 */
async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Falta el nombre del archivo .sql. Ej: run-file.ts seed-taller-demo.sql');
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no definida.');
  }
  const sql = readFileSync(join(__dirname, file), 'utf8');
  const client = new Client({
    connectionString: databaseUrl,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();
  try {
    const res: any = await client.query(sql);
    const last = Array.isArray(res) ? res[res.length - 1] : res;
    if (last?.rows?.length) {
      console.log('✓ Seed aplicado:', last.rows[0]);
    } else {
      console.log('✓ Seed aplicado.');
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Error al aplicar el seed:', e.message || e);
  process.exit(1);
});
