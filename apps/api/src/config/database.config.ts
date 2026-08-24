import { config } from 'dotenv';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * SSL de la conexión. Si se define `DB_SSL_CA` (certificado del proveedor en
 * PEM) se valida el certificado del servidor (rejectUnauthorized:true) — lo
 * ideal contra MITM. Si no hay CA, se mantiene el comportamiento actual para no
 * romper el despliegue (Render usa una cadena interna). Fuera de producción, sin
 * SSL.
 */
const sslDesde = (get: (k: string) => string | undefined) => {
  if (get('NODE_ENV') !== 'production') return false as const;
  const ca = get('DB_SSL_CA');
  if (ca) return { ca, rejectUnauthorized: true };
  const reject = get('DB_SSL_REJECT_UNAUTHORIZED') === 'true';
  return { rejectUnauthorized: reject };
};

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  synchronize: false,
  autoLoadEntities: true,
  migrations: [__dirname + '/../database/migrations/**/*.js'],
  migrationsRun: false,
  subscribers: [__dirname + '/../database/subscribers/**/*.js'],
  ssl: sslDesde((k) => configService.get<string>(k)),
  logging: configService.get('NODE_ENV') === 'development',
  // Pool explícito: sin esto node-postgres usa 10 por instancia y, al escalar
  // la API horizontalmente, se agota el max_connections del Postgres. Con
  // varias instancias conviene poner PgBouncer (modo transaction) delante y
  // dejar este `max` acorde al reparto de conexiones por instancia.
  extra: {
    max: parseInt(configService.get<string>('DB_POOL_MAX') ?? '10', 10),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  },
  // Registra en el log toda consulta que tarde más de este umbral (ms): la
  // señal más barata para cazar N+1 y falta de índices en producción.
  maxQueryExecutionTime: parseInt(
    configService.get<string>('DB_SLOW_QUERY_MS') ?? '2000',
    10,
  ),
});

// Para TypeORM CLI (migration:run, migration:revert, migration:generate)
// Requiere: npm run build && npm run migration:run
// Busca .env en apps/api (relativo al compilado en dist/config/)
const envPath = join(__dirname, '..', '..', '.env');
config({ path: envPath });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || typeof databaseUrl !== 'string') {
  throw new Error(
    `DATABASE_URL no está definida. Crea apps/api/.env desde .env.example y define DATABASE_URL. Ruta buscada: ${envPath}`,
  );
}

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  synchronize: false,
  entities: [__dirname + '/../**/*.entity.js'],
  migrations: [__dirname + '/../database/migrations/**/*.js'],
  migrationsRun: false,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  logging: process.env.NODE_ENV === 'development',
});
