import { config } from 'dotenv';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

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
  ssl:
    configService.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
  logging: configService.get('NODE_ENV') === 'development',
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
