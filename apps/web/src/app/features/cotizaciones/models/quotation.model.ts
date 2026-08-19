export enum QuotationType {
  PARTS = "PARTS",
  SERVICE = "SERVICE",
  UNIT = "UNIT",
}

export enum QuotationStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
  CONVERTED = "CONVERTED",
}

export enum QuotationPriceList {
  PUBLIC = "PUBLIC",
  WHOLESALE = "WHOLESALE",
  BUSINESS = "BUSINESS",
}

/** Urgencia del trabajo, como la ve el cliente (badges de Ricardo). */
export enum QuotationLineUrgency {
  URGENTE = "URGENTE",
  RECOMENDADO = "RECOMENDADO",
  OPCIONAL = "OPCIONAL",
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  partId: string | null;
  catalogUnitId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  urgency?: QuotationLineUrgency;
  technicianNote?: string | null;
  photos?: { id: string; url: string | null }[];
  parentItemId?: string | null;
  part?: { id: string; name: string };
  catalogUnit?: { id: string; brand: string; model: string; year: number };
}

export interface Quotation {
  id: string;
  tenantId: string;
  branchId: string;
  clientId: string | null;
  userId: string;
  approverId: string | null;
  type: QuotationType;
  folio: string;
  status: QuotationStatus;
  priceList: QuotationPriceList;
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  conditions: string | null;
  validityDate: string | null;
  pdfKey: string | null;
  createdAt: string;
  updatedAt: string;
  items?: QuotationItem[];
  client?: { id: string; companyName: string | null; firstName: string | null; lastName: string | null; phone: string };
  branch?: { id: string; name: string };
  user?: { id: string; firstName: string; lastName: string };
  approver?: { id: string; firstName: string; lastName: string };
}

export interface QuotationFilters {
  type?: QuotationType;
  status?: QuotationStatus;
  clientId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface QuotationResponse {
  data: Quotation[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateQuotationRefaccionDto {
  partId: string;
  quantity: number;
  unitPrice?: number;
}

export interface CreateQuotationItemDto {
  partId?: string;
  catalogUnitId?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
  urgency?: QuotationLineUrgency;
  technicianNote?: string;
  refacciones?: CreateQuotationRefaccionDto[];
}

export interface CreateQuotationDto {
  clientId?: string;
  branchId: string;
  type: QuotationType;
  priceList: QuotationPriceList;
  discountPct?: number;
  conditions?: string;
  validityDate?: string;
  items: CreateQuotationItemDto[];
}
