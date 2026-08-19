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
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceListItem {
  id: string;
  priceListId: string;
  partId: string;
  price: number;
  createdAt: string;
}

export interface UpsertPriceListItemDto {
  partId: string;
  price: number;
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
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
}
