export enum ClientType {
  INDIVIDUAL = "INDIVIDUAL",
  BUSINESS = "BUSINESS",
}

export interface Client {
  id: string;
  tenantId: string;
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
  notes?: string;
}
