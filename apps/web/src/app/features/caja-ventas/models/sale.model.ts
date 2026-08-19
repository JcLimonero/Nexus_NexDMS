export enum SaleStatus {
  OPEN = "OPEN",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  TRANSFER = "TRANSFER",
  MIXED = "MIXED",
}

export enum PriceList {
  PUBLIC = "PUBLIC",
  WHOLESALE = "WHOLESALE",
  BUSINESS = "BUSINESS",
}

export interface SaleItem {
  id: string;
  saleId: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  part?: { id: string; sku: string; name: string; unitOfMeasure: string };
}

export interface SalePayment {
  id: string;
  saleId: string;
  method: "CASH" | "CARD" | "TRANSFER";
  amount: number;
  reference: string | null;
}

export interface Sale {
  id: string;
  tenantId: string;
  branchId: string;
  cashSessionId: string | null;
  clientId: string | null;
  userId: string;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  priceList: PriceList;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  ticketNumber: string;
  cfdiUuid: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string };
  client?: { id: string; companyName: string | null; firstName: string | null; lastName: string | null };
  items?: SaleItem[];
  payments?: SalePayment[];
}

export interface SalesResponse {
  data: Sale[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface SaleFilters {
  search?: string;
  clientId?: string;
  status?: SaleStatus;
  cashSessionId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface CreateSaleLineDto {
  partId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CreateSalePaymentDto {
  method: "CASH" | "CARD" | "TRANSFER";
  amount: number;
  reference?: string;
}

export interface CreateSaleDto {
  clientId?: string;
  branchId: string;
  priceList: PriceList;
  discount?: number;
  notes?: string;
  lines: CreateSaleLineDto[];
  payments: CreateSalePaymentDto[];
}
