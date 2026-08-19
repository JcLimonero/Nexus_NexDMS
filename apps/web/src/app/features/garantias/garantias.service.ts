import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  Warranty,
  WarrantyFilters,
  WarrantiesResponse,
  CreateWarrantyDto,
} from "./models/warranty.model";
import { CustomerVehicle } from "../clientes/models/client.model";

const WARRANTIES_URL = "/api/v1/warranties";
const UNIT_SALES_URL = "/api/v1/unit-sales";
const SERVICE_ORDERS_URL = "/api/v1/service-orders";

export interface UnitSaleListItem {
  id: string;
  folio: string;
  clientId: string;
  catalogUnit?: { year: number; brand: string; model: string };
}

export interface ServiceOrderListItem {
  id: string;
  folio: string;
  ownerId: string;
  vehicle?: { year: number; make: string; model: string };
}

@Injectable({
  providedIn: "root",
})
export class GarantiasService {
  private http = inject(HttpClient);

  getWarranties(
    filters: WarrantyFilters = {}
  ): Observable<WarrantiesResponse> {
    let params = new HttpParams();
    if (filters.clientId) params = params.set("clientId", filters.clientId);
    if (filters.status) params = params.set("status", filters.status);
    if (filters.type) params = params.set("type", filters.type);
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<WarrantiesResponse>(WARRANTIES_URL, { params });
  }

  getWarranty(id: string): Observable<Warranty> {
    return this.http.get<Warranty>(`${WARRANTIES_URL}/${id}`);
  }

  createWarranty(dto: CreateWarrantyDto): Observable<Warranty> {
    return this.http.post<Warranty>(WARRANTIES_URL, dto);
  }

  authorize(id: string, dto: { createServiceOrder?: boolean; notes?: string }): Observable<Warranty> {
    return this.http.post<Warranty>(`${WARRANTIES_URL}/${id}/authorize`, dto);
  }

  resolve(id: string, resolution: string): Observable<Warranty> {
    return this.http.post<Warranty>(`${WARRANTIES_URL}/${id}/resolve`, {
      resolution,
    });
  }

  reject(id: string, reason?: string): Observable<Warranty> {
    return this.http.post<Warranty>(`${WARRANTIES_URL}/${id}/reject`, {
      reason: reason ?? "",
    });
  }

  getVehiclesByClient(clientId: string): Observable<CustomerVehicle[]> {
    return this.http.get<CustomerVehicle[]>(
      `/api/v1/clients/${clientId}/vehicles`
    );
  }

  getUnitSalesByClient(clientId: string): Observable<UnitSaleListItem[]> {
    return this.http.get<UnitSaleListItem[]>(UNIT_SALES_URL, {
      params: { clientId },
    });
  }

  getServiceOrdersByClient(clientId: string): Observable<{ data: ServiceOrderListItem[] }> {
    return this.http.get<{ data: ServiceOrderListItem[] }>(SERVICE_ORDERS_URL, {
      params: { clientId, limit: "100" },
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      OPEN: "Abierta",
      IN_PROGRESS: "En progreso",
      RESOLVED: "Resuelta",
      REJECTED: "Rechazada",
    };
    return labels[status] ?? status;
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      UNIT: "Unidad",
      PART: "Refacción",
      SERVICE: "Servicio",
    };
    return labels[type] ?? type;
  }
}
