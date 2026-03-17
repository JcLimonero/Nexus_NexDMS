/**
 * Tipos de documento para expediente de recompra.
 * Del vendedor: INE, COMPROBANTE_DOMICILIO, PODER_NOTARIAL, RFC
 * Estado legal de la unidad: FACTURA_ORIGINAL, LIBERACION_ADEUDO, TARJETA_CIRCULACION, TENENCIA, PLACA
 */
export const UNIT_RETURN_DOCUMENT_TYPES = [
  'INE',
  'COMPROBANTE_DOMICILIO',
  'PODER_NOTARIAL',
  'RFC',
  'FACTURA_ORIGINAL',
  'LIBERACION_ADEUDO',
  'TARJETA_CIRCULACION',
  'TENENCIA',
  'PLACA',
] as const;

export type UnitReturnDocumentType =
  (typeof UNIT_RETURN_DOCUMENT_TYPES)[number];

/** Documentos requeridos para que el expediente esté completo (seminueva disponible) */
export const REQUIRED_EXPEDIENTE_DOCUMENT_TYPES = [
  'INE',
  'FACTURA_ORIGINAL',
  'TARJETA_CIRCULACION',
  'TENENCIA',
] as const;

export const UNIT_RETURN_DOCUMENT_TYPE_LABELS: Record<
  UnitReturnDocumentType,
  string
> = {
  INE: 'Identificación oficial (INE/IFE)',
  COMPROBANTE_DOMICILIO: 'Comprobante de domicilio',
  PODER_NOTARIAL: 'Poder notarial',
  RFC: 'Cédula de identificación fiscal',
  FACTURA_ORIGINAL: 'Factura original de compra',
  LIBERACION_ADEUDO: 'Liberación de adeudo',
  TARJETA_CIRCULACION: 'Tarjeta de circulación',
  TENENCIA: 'Comprobante de tenencia',
  PLACA: 'Fotografía o documento de placas',
};
