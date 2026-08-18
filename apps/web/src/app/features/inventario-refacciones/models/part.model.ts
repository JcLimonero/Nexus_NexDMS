export enum PartVehicleType {
  MOTORCYCLE = "MOTORCYCLE",
  CAR = "CAR",
  BOTH = "BOTH",
}

export interface Part {
  id: string;
  tenantId: string;
  branchId: string;
  categoryId: string | null;
  locationId: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  vehicleType: PartVehicleType;
  compatibleMakes: string | null;
  unitOfMeasure: string;
  purchasePrice: number;
  publicPrice: number;
  wholesalePrice: number;
  businessPrice: number;
  maxDiscountPct: number;
  stockQuantity: number;
  minStock: number;
  maxStock: number | null;
  imageKey: string | null;
  preferredSupplierId: string | null;
  isOnDemand: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartEquivalence {
  id: string;
  partId: string;
  equivalentSku: string;
  brand: string | null;
  note: string | null;
  createdAt: string;
}

export interface PartSupplierTop {
  supplierId: string;
  supplierName: string;
  lastPrice: number;
  lastPurchasedAt: string | null;
  timesPurchased: number;
  supplierSku: string | null;
}

export interface PartsResponse {
  data: Part[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PartFilters {
  search?: string;
  categoryId?: string;
  vehicleType?: PartVehicleType;
  branchId?: string;
  searchScope?: "local" | "group";
  page?: number;
  limit?: number;
}

export interface CreatePartDto {
  branchId: string;
  categoryId?: string;
  locationId?: string;
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  vehicleType: PartVehicleType;
  compatibleMakes?: string;
  unitOfMeasure?: string;
  purchasePrice: number;
  publicPrice: number;
  wholesalePrice: number;
  businessPrice: number;
  maxDiscountPct?: number;
  minStock?: number;
  maxStock?: number;
  preferredSupplierId?: string | null;
  isOnDemand?: boolean;
  isActive?: boolean;
}
