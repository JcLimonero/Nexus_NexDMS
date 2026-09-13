export enum ClientType {
  INDIVIDUAL = "INDIVIDUAL",
  BUSINESS = "BUSINESS",
}

export interface Client {
  id: string;
  tenantId: string;
  /** Consecutivo crudo del cliente dentro de la empresa (1, 2, 3…). */
  clientNumber: number | null;
  /** Código legible del cliente: prefijo + C + consecutivo (APGC00000001). */
  clientCode: string | null;
  clientType: ClientType;
  isCompany: boolean;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  rfc: string | null;
  curp: string | null;
  taxRegime: string | null;
  taxPostalCode: string | null;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  fixedDiscount: number;
  /** Límite de crédito para entregar con adeudo (null = sin límite). */
  creditLimit: number | null;
  /** Lista de precios asignada (null = precios estándar). */
  priceListId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  position: string | null;
  department: string | null;
  isAuthorized: boolean;
  notes: string | null;
}

export interface CustomerVehicle {
  id: string;
  ownerId: string;
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  plate: string | null;
  vin: string | null;
  mileage: number;
}

export interface DataQuality {
  score: number;
  level: string;
  missingFields: string[];
}

/** Una orden de servicio en el historial de una unidad. */
export interface VehicleServiceHistoryItem {
  id: string;
  folio: string;
  status: string;
  reportedFailure: string;
  total: number;
  createdAt: string;
}

export interface ClientDetail extends Client {
  contacts: Contact[];
  vehicles: CustomerVehicle[];
  dataQuality: DataQuality;
}

export interface ClientFilters {
  search?: string;
  clientType?: ClientType;
  page?: number;
  limit?: number;
}

export interface ClientListItem extends Client {
  dataQuality?: DataQuality;
  /** Cuántos vehículos tiene relacionados el cliente. */
  vehicleCount?: number;
  /** Si alguno de sus vehículos ha tenido órdenes de servicio. */
  isServiceClient?: boolean;
}

export interface ClientsResponse {
  data: ClientListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateClientDto {
  clientType: ClientType;
  isCompany?: boolean;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone: string;
  phoneAlt?: string;
  email?: string;
  rfc?: string;
  curp?: string;
  taxRegime?: string;
  taxPostalCode?: string;
  address?: string;
  city?: string;
  state?: string;
  fixedDiscount?: number;
  creditLimit?: number | null;
  priceListId?: string | null;
  notes?: string;
}
