import { BadRequestException, PipeTransform } from '@nestjs/common';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export function validateLogoFile(file: Express.Multer.File): void {
  if (!file) {
    throw new BadRequestException('Archivo requerido');
  }
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    throw new BadRequestException(
      'Tipo de archivo no permitido. Use: jpeg, png o webp',
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new BadRequestException(
      `Tamaño máximo: 2MB. Recibido: ${(file.size / 1024).toFixed(1)}KB`,
    );
  }
}

export class LogoFileValidationPipe implements PipeTransform {
  transform(value: Express.Multer.File | undefined) {
    validateLogoFile(value as Express.Multer.File);
    return value;
  }
}
