import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Comprueba que el POST del webhook lo mandó Meta y no cualquiera.
 *
 * Meta firma el cuerpo con el App Secret y manda el resultado en
 * `X-Hub-Signature-256`. Sin esta verificación, el endpoint es una vía abierta
 * para inyectar mensajes falsos: hasta ahora sólo se validaba el token del GET
 * de verificación, que no protege el POST.
 *
 * La firma es sobre los bytes crudos, no sobre el JSON reserializado (basta un
 * espacio de diferencia para que no cuadre). De ahí `rawBody: true` en
 * `main.ts`.
 */
@Injectable()
export class WhatsappSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WhatsappSignatureGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('WHATSAPP_APP_SECRET');

    if (!secret) {
      // En desarrollo se prueba el webhook con curl, sin firma. En producción
      // faltar el secreto es un error de despliegue, no una excusa para dejar
      // pasar cualquier cosa.
      if (this.config.get<string>('NODE_ENV') === 'production') {
        this.logger.error(
          'WHATSAPP_APP_SECRET no está definido: se rechaza el webhook',
        );
        throw new ForbiddenException('Webhook no configurado');
      }
      return true;
    }

    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const header = req.headers['x-hub-signature-256'];
    const received = Array.isArray(header) ? header[0] : header;

    if (!received?.startsWith('sha256=')) {
      throw new ForbiddenException('Firma ausente');
    }
    if (!req.rawBody) {
      this.logger.error(
        'No hay rawBody: falta `rawBody: true` al crear la app Nest',
      );
      throw new ForbiddenException('Firma no verificable');
    }

    const expected =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');

    // Longitudes distintas hacen que timingSafeEqual tire; se compara antes.
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new ForbiddenException('Firma inválida');
    }
    return true;
  }
}
