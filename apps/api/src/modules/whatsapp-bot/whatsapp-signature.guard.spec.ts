import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WhatsappSignatureGuard } from './whatsapp-signature.guard';

const SECRET = 'app-secret-de-prueba';
const BODY = Buffer.from(JSON.stringify({ entry: [{ id: '1' }] }));

function sign(body: Buffer, secret: string): string {
  return (
    'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
  );
}

function contextWith(
  headers: Record<string, string>,
  rawBody?: Buffer,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers, rawBody }) }),
  } as unknown as ExecutionContext;
}

/** ConfigService de mentiras con sólo las llaves que le importan al guard. */
function guardWith(env: Record<string, string | undefined>) {
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new WhatsappSignatureGuard(config);
}

describe('WhatsappSignatureGuard', () => {
  it('deja pasar un cuerpo firmado con el App Secret', () => {
    const guard = guardWith({ WHATSAPP_APP_SECRET: SECRET });
    const ctx = contextWith(
      { 'x-hub-signature-256': sign(BODY, SECRET) },
      BODY,
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rechaza una firma hecha con otro secreto', () => {
    const guard = guardWith({ WHATSAPP_APP_SECRET: SECRET });
    const ctx = contextWith(
      { 'x-hub-signature-256': sign(BODY, 'otro-secreto') },
      BODY,
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rechaza si el cuerpo cambió después de firmarse', () => {
    const guard = guardWith({ WHATSAPP_APP_SECRET: SECRET });
    const firma = sign(BODY, SECRET);
    const alterado = Buffer.from(JSON.stringify({ entry: [{ id: '666' }] }));
    const ctx = contextWith({ 'x-hub-signature-256': firma }, alterado);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rechaza cuando no viene la cabecera de firma', () => {
    const guard = guardWith({ WHATSAPP_APP_SECRET: SECRET });
    expect(() => guard.canActivate(contextWith({}, BODY))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza si no hay rawBody: sin los bytes crudos no se puede verificar', () => {
    const guard = guardWith({ WHATSAPP_APP_SECRET: SECRET });
    const ctx = contextWith({ 'x-hub-signature-256': sign(BODY, SECRET) });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('en producción, sin App Secret configurado, no deja pasar nada', () => {
    const guard = guardWith({ NODE_ENV: 'production' });
    const ctx = contextWith(
      { 'x-hub-signature-256': sign(BODY, SECRET) },
      BODY,
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('fuera de producción, sin App Secret, deja probar el webhook con curl', () => {
    const guard = guardWith({ NODE_ENV: 'development' });
    expect(guard.canActivate(contextWith({}))).toBe(true);
  });
});
