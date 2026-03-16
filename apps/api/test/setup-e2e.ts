import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';

/**
 * Configura la app para tests E2E (prefijo global, pipes).
 * Usar después de moduleFixture.createNestApplication().
 */
export function configureE2eApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  return app;
}
