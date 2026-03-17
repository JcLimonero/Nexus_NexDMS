export enum PriceListType {
  PUBLIC = "PUBLIC",
  WHOLESALE = "WHOLESALE",
  BUSINESS = "BUSINESS",
}

export interface PriceList {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  type: PriceListType;
  discountPct: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceListFilters {
  branchId?: string;
  isActive?: boolean;
}

export interface CreatePriceListDto {
  branchId: string;
  name: string;
  type: PriceListType;
  discountPct?: number;
  isActive?: boolean;
}
