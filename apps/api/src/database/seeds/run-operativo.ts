import { config } from 'dotenv';
import { join } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

// Carga apps/api/.env (relativo a src/database/seeds).
config({ path: join(__dirname, '..', '..', '..', '.env') });

/**
 * Corre demo-operativo.sql contra la BD que apunte DATABASE_URL. Genera datos
 * operativos de demostración (órdenes, citas, ventas, cotizaciones, compras,
 * caja, leads, garantías, PLD, etc.) fechados relativos a HOY (usa now()).
 *
 * Requisitos previos: el tenant 'demo' y su equipo ya sembrados
 * (`npm run seed`). SSL se activa con NODE_ENV=production (BD managed/Render).
 *
 * Uso local:   npm run seed:operativo
 * Uso Render:  NODE_ENV=production DATABASE_URL="<external-url>" npm run seed:operativo
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no definida.');
  }
  const sql = readFileSync(join(__dirname, 'demo-operativo.sql'), 'utf8');
  const client = new Client({
    connectionString: databaseUrl,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();
  try {
    // Atómico: si algo falla, no queda data parcial.
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✓ Datos operativos demo cargados (fechados para hoy).');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Error al cargar datos operativos:', e.message || e);
  process.exit(1);
});
