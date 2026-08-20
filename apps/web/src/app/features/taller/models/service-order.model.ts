export enum ServiceOrderStatus {
  RECEIVED = "RECEIVED",
  DIAGNOSIS = "DIAGNOSIS",
  IN_PROGRESS = "IN_PROGRESS",
  WAITING_PARTS = "WAITING_PARTS",
  READY = "READY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

/** Un cambio registrado de la fecha prometida de entrega. */
export interface PromiseChange {
  id: string;
  oldPromisedAt: string | null;
  newPromisedAt: string | null;
  reason: string;
  changedBy: string | null;
  createdAt: string;
}

export interface ServiceOrderVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  plate: string | null;
  mileage: number;
}

export interface ServiceOrder {
  id: string;
  tenantId: string;
  branchId: string;
  ownerId: string;
  vehicleId: string;
  userId: string;
  mechanicId: string | null;
  folio: string;
  status: ServiceOrderStatus;
  reportedFault: string;
  diagnosis: string | null;
  workPerformed: string | null;
  kmIn: number;
  kmOut: number | null;
  laborCost: number;
  partsCost: number;
  discount: number;
  total: number;
  receivedAt: string;
  promisedAt: string | null;
  /** Unidad de cortesía prestada mientras la del cliente está en el taller. */
  substituteUnitId?: string | null;
  substituteDeliveredAt?: string | null;
  substituteReturnedAt?: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; companyName: string | null; firstName: string | null; lastName: string | null; phone: string };
  vehicle?: ServiceOrderVehicle;
  mechanic?: { id: string; firstName: string; lastName: string };
  branch?: { id: string; name: string };
  user?: { id: string; firstName: string; lastName: string };
}

export interface ServiceOrderFilters {
  search?: string;
  clientId?: string;
  mechanicId?: string;
  status?: ServiceOrderStatus;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ServiceOrdersResponse {
  data: ServiceOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateServiceOrderDto {
  ownerId: string;
  vehicleId: string;
  branchId: string;
  reportedFault: string;
  kmIn: number;
  receptionContactId?: string;
  receptionName?: string;
  receptionPhone?: string;
  mechanicId?: string;
  appointmentId?: string;
  serviceTypeId?: string;
  quotationId?: string;
  promisedAt?: string;
  notes?: string;
  nextServiceDate?: string;
  nextServiceMileage?: number;
}
