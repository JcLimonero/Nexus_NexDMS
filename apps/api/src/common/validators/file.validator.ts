import { BadRequestException, PipeTransform } from '@nestjs/common';

/** Tipos de imagen aceptados para logotipos, iconos y avatares. */
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Límite de tamaño para imágenes (logos, iconos, avatares): 2MB. */
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
/** Límite de tamaño para documentos (pdf/imagen): 10MB. */
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
/** Tipos aceptados para documentos de clientes: PDF o imagen. */
export const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'];

const ALLOWED_MIMES = IMAGE_MIME_TYPES;
const MAX_SIZE_BYTES = MAX_IMAGE_SIZE_BYTES;

/**
 * Valida tipo y tamaño de un archivo subido contra una lista de MIME y un
 * límite de bytes. Reutilizable por cualquier endpoint de subida.
 */
export function validateUploadedFile(
  file: Express.Multer.File | undefined,
  options: {
    allowedMimes: string[];
    maxSizeBytes: number;
    /** Tamaño real cuando ya se leyó el buffer (opcional; por defecto file.size). */
    sizeBytes?: number;
  },
): void {
  if (!file) {
    throw new BadRequestException('Archivo requerido');
  }
  if (!options.allowedMimes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Tipo de archivo no permitido. Use: ${options.allowedMimes.join(', ')}`,
    );
  }
  const size = options.sizeBytes ?? file.size;
  if (size > options.maxSizeBytes) {
    const maxMb = (options.maxSizeBytes / 1024 / 1024).toFixed(0);
    throw new BadRequestException(
      `Tamaño máximo: ${maxMb}MB. Recibido: ${(size / 1024).toFixed(1)}KB`,
    );
  }
}

export function validateLogoFile(file: Express.Multer.File): void {
  validateUploadedFile(file, {
    allowedMimes: ALLOWED_MIMES,
    maxSizeBytes: MAX_SIZE_BYTES,
  });
}

/**
 * Sanea el nombre original de un archivo para usarlo con seguridad en claves de
 * almacenamiento: reemplaza cualquier carácter fuera de [A-Za-z0-9._-] por "_".
 */
export function sanitizeFilename(originalname: string): string {
  const base = (originalname || 'archivo').replace(/[^A-Za-z0-9._-]/g, '_');
  return base || 'archivo';
}

export class LogoFileValidationPipe implements PipeTransform {
  transform(value: Express.Multer.File | undefined) {
    validateLogoFile(value as Express.Multer.File);
    return value;
  }
}
