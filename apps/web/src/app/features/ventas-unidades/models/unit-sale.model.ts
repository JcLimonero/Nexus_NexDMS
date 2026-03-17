export enum UnitSaleFinancingType {
  CASH = "CASH",
  AGENCY_CREDIT = "AGENCY_CREDIT",
  BANK_CREDIT = "BANK_CREDIT",
}

export enum UnitSaleStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface UnitAccessory {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  description: string | null;
}

export interface UnitSaleAccessoryItem {
  accessoryId: string;
  quantity: number;
}

export interface CreateUnitSaleDto {
  catalogUnitId: string;
  clientId: string;
  reservationId?: string;
  finalPrice: number;
  downPayment: number;
  financingType: UnitSaleFinancingType;
  bankFinancier?: string;
  bankFolio?: string;
  deliveryDate?: string;
  notes?: string;
  accessories?: UnitSaleAccessoryItem[];
}

export interface UnitSale {
  id: string;
  catalogUnitId: string;
  clientId: string;
  folio: string;
  listPrice: number;
  finalPrice: number;
  advanceApplied: number;
  downPayment: number;
  financingType: UnitSaleFinancingType;
  bankFinancier: string | null;
  bankFolio: string | null;
  status: UnitSaleStatus;
  deliveryDate: string | null;
  notes: string | null;
  createdAt: string;
  catalogUnit?: { year: number; brand: string; model: string; serialNumber: string };
  client?: { firstName: string | null; lastName: string | null; companyName: string | null };
}
