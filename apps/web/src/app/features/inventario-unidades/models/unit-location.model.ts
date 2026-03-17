export enum UnitLocationZone {
  LOT = "LOT",
  EXHIBITION = "EXHIBITION",
  WAREHOUSE = "WAREHOUSE",
}

export interface UnitLocation {
  id: string;
  tenantId: string;
  branchId: string;
  code: string;
  zone: UnitLocationZone;
  space: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUnitLocationDto {
  branchId: string;
  code: string;
  zone: UnitLocationZone;
  space: string;
  description?: string;
}
