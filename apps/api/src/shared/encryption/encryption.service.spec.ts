import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EncryptionService } from './encryption.service';

const KEY = 'a'.repeat(64); // 32 bytes en hex
const cfg = { get: () => KEY } as unknown as ConfigService;

describe('EncryptionService', () => {
  const svc = new EncryptionService(cfg);

  it('cifra con GCM y descifra de vuelta (round-trip)', () => {
    const cifrado = svc.encrypt('secreto-de-facturapi');
    expect(cifrado.startsWith('gcm:')).toBe(true);
    expect(svc.decrypt(cifrado)).toBe('secreto-de-facturapi');
  });

  it('sigue descifrando el formato viejo CBC (compatibilidad)', () => {
    const key = Buffer.from(KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const c = crypto.createCipheriv('aes-256-cbc', key, iv);
    const enc = Buffer.concat([c.update('valor-legacy', 'utf8'), c.final()]);
    const legacy = iv.toString('hex') + ':' + enc.toString('hex');
    expect(svc.decrypt(legacy)).toBe('valor-legacy');
  });

  it('detecta manipulación del texto cifrado (GCM autenticado)', () => {
    const partes = svc.encrypt('intacto').split(':');
    // Altera el último carácter del texto cifrado → el tag ya no cuadra.
    const ult = partes[3].slice(-1);
    partes[3] = partes[3].slice(0, -1) + (ult === '0' ? '1' : '0');
    expect(() => svc.decrypt(partes.join(':'))).toThrow();
  });

  it('rechaza una llave inválida al construir', () => {
    expect(
      () => new EncryptionService({ get: () => 'corta' } as unknown as ConfigService),
    ).toThrow();
  });
});
