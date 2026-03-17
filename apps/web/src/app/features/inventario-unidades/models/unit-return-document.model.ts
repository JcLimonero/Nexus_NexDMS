export type UnitReturnDocumentType =
  | "INE"
  | "COMPROBANTE_DOMICILIO"
  | "PODER_NOTARIAL"
  | "RFC"
  | "FACTURA_ORIGINAL"
  | "LIBERACION_ADEUDO"
  | "TARJETA_CIRCULACION"
  | "TENENCIA"
  | "PLACA";

export type UnitReturnDocumentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export interface UnitReturnDocument {
  id: string;
  tenantId: string;
  unitReturnId: string;
  documentType: UnitReturnDocumentType;
  name: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  status: UnitReturnDocumentStatus;
  validatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export const UNIT_RETURN_DOCUMENT_TYPE_LABELS: Record<
  UnitReturnDocumentType,
  string
> = {
  INE: "Identificación oficial (INE/IFE)",
  COMPROBANTE_DOMICILIO: "Comprobante de domicilio",
  PODER_NOTARIAL: "Poder notarial",
  RFC: "Cédula de identificación fiscal",
  FACTURA_ORIGINAL: "Factura original de compra",
  LIBERACION_ADEUDO: "Liberación de adeudo",
  TARJETA_CIRCULACION: "Tarjeta de circulación",
  TENENCIA: "Comprobante de tenencia",
  PLACA: "Fotografía o documento de placas",
};

export const UNIT_RETURN_DOCUMENT_TYPES: UnitReturnDocumentType[] = [
  "INE",
  "COMPROBANTE_DOMICILIO",
  "PODER_NOTARIAL",
  "RFC",
  "FACTURA_ORIGINAL",
  "LIBERACION_ADEUDO",
  "TARJETA_CIRCULACION",
  "TENENCIA",
  "PLACA",
];
