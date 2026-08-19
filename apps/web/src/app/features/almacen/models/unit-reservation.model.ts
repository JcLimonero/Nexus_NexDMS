export enum UnitReservationStatus {
  ACTIVE = "ACTIVE",
  CONVERTED = "CONVERTED",
  RELEASED = "RELEASED",
}

export interface UnitReservation {
  id: string;
  tenantId: string;
  catalogUnitId: string;
  clientId: string;
  advanceAmount: number;
  status: UnitReservationStatus;
  notes: string | null;
  releasedById: string | null;
  releaseReason: string | null;
  createdAt: string;
  updatedAt: string;
  catalogUnit?: {
    id: string;
    serialNumber: string;
    year: number;
    brand: string;
    model: string;
    branchId: string;
  };
  client?: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string;
  };
}

export interface UnitReservationFilters {
  status?: UnitReservationStatus;
  catalogUnitId?: string;
  clientId?: string;
  branchId?: string;
}

export interface CreateUnitReservationDto {
  catalogUnitId: string;
  clientId: string;
  advanceAmount: number;
  notes?: string;
}
