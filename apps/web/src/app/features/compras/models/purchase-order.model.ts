export enum PurchaseOrderStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PARTIAL = "PARTIAL",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  partId: string;
  quantity: number;
  quantityReceived: number;
  unitPrice: number;
  subtotal: number;
  part?: {
    id: string;
    sku: string;
    name: string;
    unitOfMeasure: string;
  };
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  branchId: string;
  supplierId: string;
  userId: string;
  folio: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  supplierInvoiceUuid: string | null;
  orderedAt: string;
  expectedAt: string | null;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderFilters {
  search?: string;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseOrdersResponse {
  data: PurchaseOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreatePurchaseOrderLineDto {
  partId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderDto {
  branchId: string;
  supplierId: string;
  orderedAt: string;
  expectedAt?: string;
  notes?: string;
  lines: CreatePurchaseOrderLineDto[];
}

export interface ReceiveLineDto {
  itemId: string;
  quantityReceived: number;
}

export interface ReceivePurchaseOrderDto {
  lines: ReceiveLineDto[];
  notes?: string;
}

// ─── Requisiciones (bajo demanda) e import de CFDI ───────────

export interface PurchaseRequisition {
  id: string;
  tenantId: string;
  branchId: string;
  partId: string;
  quantity: number;
  status: "PENDING" | "ORDERED" | "CANCELLED";
  sourceType: string;
  sourceId: string | null;
  note: string | null;
  purchaseOrderId: string | null;
  createdAt: string;
  // Anexados por el backend para la lista:
  partSku: string | null;
  partName: string | null;
  preferredSupplierId: string | null;
}

export interface ImportCfdiResult {
  order: PurchaseOrder;
  emparejados: number;
  noEmparejados: { sku: string; descripcion: string; cantidad: number }[];
}
