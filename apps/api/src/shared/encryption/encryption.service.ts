import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const keyHex = this.config.get<string>('ENCRYPTION_KEY')?.trim();
    if (!keyHex || keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
      throw new BadRequestException(
        'ENCRYPTION_KEY debe ser 64 caracteres hexadecimales (32 bytes). ' +
          "Generar con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Cifra con AES-256-GCM (autenticado: detecta manipulación). Formato:
   * `gcm:iv:tag:datos` en hex. Los datos viejos en CBC (`iv:datos`) siguen
   * siendo legibles por `decrypt`, así que no hace falta re-cifrar de golpe.
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `gcm:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(encrypted: string): string {
    // Formato nuevo autenticado: gcm:iv:tag:datos
    if (encrypted.startsWith('gcm:')) {
      const [, ivHex, tagHex, dataHex] = encrypted.split(':');
      if (!ivHex || !tagHex || !dataHex) {
        throw new BadRequestException('Formato de dato cifrado inválido');
      }
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(ivHex, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      return Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
      ]).toString('utf8');
    }
    // Compatibilidad: formato viejo CBC (iv:datos).
    const [ivHex, dataHex] = encrypted.split(':');
    if (!ivHex || !dataHex) {
      throw new BadRequestException('Formato de dato cifrado inválido');
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
}
