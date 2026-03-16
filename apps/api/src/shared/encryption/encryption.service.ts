import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const keyHex = this.config.get<string>('ENCRYPTION_KEY')?.trim();
    if (!keyHex || keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
      throw new Error(
        'ENCRYPTION_KEY debe ser 64 caracteres hexadecimales (32 bytes). ' +
          'Generar con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(encrypted: string): string {
    const [ivHex, dataHex] = encrypted.split(':');
    if (!ivHex || !dataHex) {
      throw new Error('Formato de dato cifrado inválido');
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
