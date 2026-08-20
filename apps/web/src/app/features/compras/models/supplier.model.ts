export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  rfc: string | null;
  address: string | null;
  paymentTerms: string | null;
  creditDays: number;
  creditLimit: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Estado de la línea de crédito con un proveedor. */
export interface SupplierCredit {
  creditLimit: number;
  enUso: number;
  disponible: number;
}

export interface SupplierFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface SuppliersResponse {
  data: Supplier[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateSupplierDto {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  rfc?: string;
  address?: string;
  paymentTerms?: string;
  creditDays?: number;
  creditLimit?: number;
  notes?: string;
  isActive?: boolean;
}
