import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  CSRF_HEADER,
  leerCookie,
} from './common/auth/cookies';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.use(helmet());

  // CSRF (double-submit) para sesiones por cookie. Solo aplica a métodos que
  // mutan y solo cuando la petición se autentica por cookie: el header Bearer
  // es inmune a CSRF (un sitio ajeno no puede fijar ese header), así que las
  // apps aún no migradas siguen funcionando sin token CSRF.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const metodo = req.method.toUpperCase();
    const mutante =
      metodo === 'POST' ||
      metodo === 'PUT' ||
      metodo === 'PATCH' ||
      metodo === 'DELETE';
    if (!mutante) return next();
    const porCookie = !!leerCookie(req, ACCESS_COOKIE);
    const porBearer = (req.headers.authorization ?? '').startsWith('Bearer ');
    if (!porCookie || porBearer) return next();
    const cookie = leerCookie(req, CSRF_COOKIE);
    const header = req.headers[CSRF_HEADER];
    if (cookie && header && cookie === header) return next();
    return res
      .status(403)
      .json({ statusCode: 403, message: 'Token CSRF inválido o ausente' });
  });
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
    // Necesario para que el navegador mande la cookie de sesión en peticiones
    // XHR/fetch. En prod el API es mismo-origen (rewrite de Vercel); esto cubre
    // cualquier acceso directo cruzado y no abre el CORS (el origen sigue siendo
    // la lista blanca, no `*`).
    credentials: true,
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
      .setTitle('NexQSystem API')
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
