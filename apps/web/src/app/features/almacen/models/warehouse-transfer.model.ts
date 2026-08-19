export enum WarehouseTransferType {
  INTRA_BRAND = "INTRA_BRAND",
  INTER_BRAND = "INTER_BRAND",
}

export enum WarehouseTransferStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  IN_TRANSIT = "IN_TRANSIT",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
}

export interface WarehouseTransferItem {
  id: string;
  warehouseTransferId: string;
  partId: string;
  quantity: number;
  part?: {
    id: string;
    sku: string;
    name: string;
    unitOfMeasure: string;
  };
}

export interface WarehouseTransfer {
  id: string;
  tenantId: string;
  originBranchId: string;
  destinationBranchId: string;
  approverId: string | null;
  folio: string;
  type: WarehouseTransferType;
  status: WarehouseTransferStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  originBranch?: { id: string; name: string };
  destinationBranch?: { id: string; name: string };
  items?: WarehouseTransferItem[];
}

export interface WarehouseTransferFilters {
  search?: string;
  originBranchId?: string;
  destinationBranchId?: string;
  status?: WarehouseTransferStatus;
  page?: number;
  limit?: number;
}

export interface WarehouseTransfersResponse {
  data: WarehouseTransfer[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateWarehouseTransferLineDto {
  partId: string;
  quantity: number;
}

export interface CreateWarehouseTransferDto {
  originBranchId: string;
  destinationBranchId: string;
  type: WarehouseTransferType;
  notes?: string;
  lines: CreateWarehouseTransferLineDto[];
}
