export enum CatalogUnitVehicleType {
  MOTORCYCLE = "MOTORCYCLE",
  CAR = "CAR",
  SUV = "SUV",
  MINIVAN = "MINIVAN",
  TRUCK = "TRUCK",
  VAN = "VAN",
  CARGO_VAN = "CARGO_VAN",
  BOX_TRUCK = "BOX_TRUCK",
}

export enum CatalogUnitStatus {
  AVAILABLE = "AVAILABLE",
  RESERVED = "RESERVED",
  SOLD = "SOLD",
  WRITTEN_OFF = "WRITTEN_OFF",
  PENDING_EXPEDIENTE = "PENDING_EXPEDIENTE",
}

export enum CatalogUnitCondition {
  NEW = "NEW",
  USED = "USED",
}

export interface ExpedienteStatus {
  complete: boolean;
  hasSeller: boolean;
  missingDocs: string[];
  lastReturn: { id: string; clientName: string; returnDate: string } | null;
  canBecomeAvailable: boolean;
}

export interface UnitHistoryEvent {
  type: "ACQUISITION" | "SALE" | "RETURN";
  date: string;
  id?: string;
  clientId?: string;
  clientName?: string;
  finalPrice?: number;
  buybackPrice?: number;
  deliveryDate?: string;
  folio?: string;
  mileage?: number;
}

export interface CatalogUnit {
  id: string;
  tenantId: string;
  branchId: string;
  globalModelId: string | null;
  vehicleType: CatalogUnitVehicleType;
  brand: string;
  model: string;
  year: number;
  version: string | null;
  color: string;
  interiorColor?: string | null;
  exteriorColorId?: string | null;
  interiorColorId?: string | null;
  serialNumber: string;
  engineNumber: string | null;
  displacement: number | null;
  doorCount: number | null;
  costPrice: number;
  listPrice: number;
  salePrice: number;
  status: CatalogUnitStatus;
  conditionType?: CatalogUnitCondition;
  locationId: string | null;
  imageKey: string | null;
  imagesKeys: string[] | null;
  notes: string | null;
  acquisitionDate: string | null;
  lastServiceDate: string | null;
  lastServiceMileage: number | null;
  nextServiceDate: string | null;
  nextServiceMileage: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogUnitsResponse {
  data: CatalogUnit[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CatalogUnitFilters {
  vehicleType?: CatalogUnitVehicleType;
  brand?: string;
  status?: CatalogUnitStatus;
  searchScope?: "local" | "group";
  branchId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateCatalogUnitDto {
  branchId: string;
  globalModelId: string;
  vehicleType: CatalogUnitVehicleType;
  conditionType?: CatalogUnitCondition;
  brand?: string;
  model?: string;
  year?: number;
  version?: string;
  color?: string;
  interiorColor?: string;
  exteriorColorId: string;
  interiorColorId?: string;
  serialNumber: string;
  engineNumber?: string;
  displacement?: number;
  doorCount?: number;
  costPrice: number;
  listPrice: number;
  salePrice: number;
  locationId?: string;
  imageKey?: string;
  notes?: string;
  acquisitionDate?: string;
}
