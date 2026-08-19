export interface StockLocation {
  id: string;
  tenantId: string;
  branchId: string;
  code: string;
  zone: string;
  aisle: string | null;
  shelf: string | null;
  level: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateStockLocationDto {
  branchId: string;
  code?: string;
  zone: string;
  aisle?: string;
  shelf?: string;
  level?: string;
  description?: string;
  isActive?: boolean;
}
