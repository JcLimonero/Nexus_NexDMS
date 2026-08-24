import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.use(helmet());
  // CORS restringido a los orígenes conocidos (por env, coma-separados). Si no
  // hay lista configurada se cae a los dominios de producción de Nexus.
  const origenesEnv = process.env.CORS_ORIGINS?.trim();
  const origenes = origenesEnv
    ? origenesEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : [
        'https://app.nexusqsystem.com',
        'https://admin.nexusqsystem.com',
        'https://pwa.nexusqsystem.com',
        'https://recepcion.nexusqsystem.com',
      ];
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production' ? origenes : true,
    credentials: false,
  });
  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api/v1');

  // Respeta @Exclude() de las entidades (no filtra passwordHash/totpSecret).
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NexDMS API')
      .setDescription('Dealer Management System — Nexus Q Tech')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
