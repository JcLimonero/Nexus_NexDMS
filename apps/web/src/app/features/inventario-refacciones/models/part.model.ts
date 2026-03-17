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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  isActive?: boolean;
}
