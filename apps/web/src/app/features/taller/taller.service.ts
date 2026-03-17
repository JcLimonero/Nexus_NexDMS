import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  ServiceOrder,
  ServiceOrderFilters,
  ServiceOrdersResponse,
  CreateServiceOrderDto,
  ServiceOrderStatus,
} from "./models/service-order.model";
import { CustomerVehicle } from "../clientes/models/client.model";

const SERVICE_ORDERS_URL = "/api/v1/service-orders";
const USER_AVAILABILITY_URL = "/api/v1/user-availability";
const SERVICE_TYPES_URL = "/api/v1/service-types";

@Injectable({
  providedIn: "root",
})
export class TallerService {
  private http = inject(HttpClient);

  getServiceOrders(
    filters: ServiceOrderFilters = {}
  ): Observable<ServiceOrdersResponse> {
    let params = new HttpParams();
    if (filters.clientId) params = params.set("clientId", filters.clientId);
    if (filters.mechanicId) params = params.set("mechanicId", filters.mechanicId);
    if (filters.status) params = params.set("status", filters.status);
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.dateFrom) params = params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params = params.set("dateTo", filters.dateTo);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<ServiceOrdersResponse>(SERVICE_ORDERS_URL, {
      params,
    });
  }

  getServiceOrder(id: string): Observable<ServiceOrder> {
    return this.http.get<ServiceOrder>(`${SERVICE_ORDERS_URL}/${id}`);
  }

  createServiceOrder(dto: CreateServiceOrderDto): Observable<ServiceOrder> {
    return this.http.post<ServiceOrder>(SERVICE_ORDERS_URL, dto);
  }

  changeStatus(
    id: string,
    status: ServiceOrderStatus,
    notes?: string
  ): Observable<ServiceOrder> {
    return this.http.post<ServiceOrder>(
      `${SERVICE_ORDERS_URL}/${id}/change-status`,
      { status, notes }
    );
  }

  assignMechanic(id: string, mechanicId: string): Observable<ServiceOrder> {
    return this.http.post<ServiceOrder>(
      `${SERVICE_ORDERS_URL}/${id}/assign-mechanic`,
      { mechanicId }
    );
  }

  cancelServiceOrder(id: string): Observable<ServiceOrder> {
    return this.http.post<ServiceOrder>(
      `${SERVICE_ORDERS_URL}/${id}/cancel`,
      {}
    );
  }

  getVehiclesByClient(clientId: string): Observable<CustomerVehicle[]> {
    return this.http.get<CustomerVehicle[]>(
      `/api/v1/clients/${clientId}/vehicles`
    );
  }

  createVehicle(
    clientId: string,
    dto: {
      vehicleType: string;
      make: string;
      model: string;
      year: number;
      color?: string;
      plate?: string;
      vin?: string;
      mileage?: number;
    }
  ): Observable<CustomerVehicle> {
    return this.http.post<CustomerVehicle>(
      `/api/v1/clients/${clientId}/vehicles`,
      dto
    );
  }

  getMechanicsForBranch(branchId: string): Observable<{ id: string; firstName: string; lastName: string }[]> {
    return this.http.get<{ id: string; firstName: string; lastName: string }[]>(
      `${USER_AVAILABILITY_URL}/mechanics-with-details`,
      { params: { branchId } }
    );
  }

  getServiceTypes(branchId: string): Observable<{ id: string; name: string }[]> {
    return this.http.get<{ id: string; name: string }[]>(SERVICE_TYPES_URL, {
      params: { branchId },
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      RECEIVED: "Recibida",
      DIAGNOSIS: "Diagnóstico",
      IN_PROGRESS: "En progreso",
      WAITING_PARTS: "Esperando refacciones",
      READY: "Lista para entregar",
      DELIVERED: "Entregada",
      CANCELLED: "Cancelada",
    };
    return labels[status] ?? status;
  }
}
