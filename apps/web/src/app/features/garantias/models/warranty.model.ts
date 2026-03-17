export enum WarrantyStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED",
}

export enum WarrantyType {
  UNIT = "UNIT",
  PART = "PART",
  SERVICE = "SERVICE",
}

export interface WarrantyVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  plate: string | null;
  mileage: number;
}

export interface Warranty {
  id: string;
  tenantId: string;
  branchId: string;
  unitSaleId: string | null;
  serviceOrderId: string | null;
  clientId: string;
  vehicleId: string;
  authorizerId: string | null;
  type: WarrantyType;
  description: string;
  status: WarrantyStatus;
  resolution: string | null;
  newServiceOrderId: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; companyName: string | null; firstName: string | null; lastName: string | null; phone: string };
  vehicle?: WarrantyVehicle;
  branch?: { id: string; name: string };
  authorizer?: { id: string; firstName: string; lastName: string };
  unitSale?: { id: string; folio: string };
  serviceOrder?: { id: string; folio: string };
  newServiceOrder?: { id: string; folio: string };
}

export interface WarrantyFilters {
  clientId?: string;
  status?: WarrantyStatus;
  type?: WarrantyType;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface WarrantiesResponse {
  data: Warranty[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateWarrantyDto {
  clientId: string;
  vehicleId: string;
  branchId: string;
  type: WarrantyType;
  description: string;
  startDate: string;
  endDate: string;
  unitSaleId?: string;
  serviceOrderId?: string;
}
