export enum CfdiType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  PAYMENT = "PAYMENT",
}

export enum CfdiStatus {
  VALID = "VALID",
  CANCELLED = "CANCELLED",
}

export interface CfdiLog {
  id: string;
  tenantId: string;
  branchId: string;
  referenceId: string;
  referenceType: string;
  cfdiType: CfdiType;
  satUuid: string;
  facturaapiInvoiceId: string | null;
  series: string;
  fiscalFolio: string;
  xmlKey: string;
  pdfKey: string;
  total: number;
  status: CfdiStatus;
  cancellationReason: string | null;
  cancelledById: string | null;
  stampedAt: string;
  cancelledAt: string | null;
  createdAt: string;
  branch?: { id: string; name: string };
}

export interface CfdiDetail extends CfdiLog {
  xmlUrl?: string;
  pdfUrl?: string;
}

export interface CfdiFilters {
  branchId?: string;
  tipo?: CfdiType;
  status?: CfdiStatus;
  fechaDesde?: string;
  fechaHasta?: string;
  referenceId?: string;
  page?: number;
  limit?: number;
}

export interface CfdiResponse {
  data: CfdiLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CancelCfdiDto {
  motivoCancelacion: "01" | "02" | "03" | "04";
  cfdiSustitucionId?: string;
}

export interface RegisterPagoDto {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
}
