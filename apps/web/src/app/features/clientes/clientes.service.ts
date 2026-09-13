import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, map } from "rxjs";
import {
  Client,
  ClientDetail,
  ClientFilters,
  ClientsResponse,
  CreateClientDto,
  CustomerVehicle,
  VehicleServiceHistoryItem,
} from "./models/client.model";

const API_URL = "/api/v1/clients";

@Injectable({
  providedIn: "root",
})
export class ClientesService {
  private http = inject(HttpClient);

  getAll(filters: ClientFilters = {}): Observable<ClientsResponse> {
    let params = new HttpParams();
    if (filters.search) params = params.set("search", filters.search);
    if (filters.clientType) params = params.set("clientType", filters.clientType);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());

    return this.http.get<ClientsResponse>(API_URL, { params });
  }

  search(q: string, limit = 8): Observable<Client[]> {
    const params = new HttpParams()
      .set("q", q)
      .set("limit", limit.toString());
    return this.http.get<Client[]>(`${API_URL}/search`, { params });
  }

  getById(id: string): Observable<ClientDetail> {
    return this.http.get<ClientDetail>(`${API_URL}/${id}`);
  }

  getVehicle(
    clientId: string,
    vehicleId: string,
  ): Observable<CustomerVehicle> {
    return this.http.get<CustomerVehicle>(
      `${API_URL}/${clientId}/vehicles/${vehicleId}`,
    );
  }

  getVehicleServiceHistory(
    clientId: string,
    vehicleId: string,
  ): Observable<VehicleServiceHistoryItem[]> {
    return this.http.get<VehicleServiceHistoryItem[]>(
      `${API_URL}/${clientId}/vehicles/${vehicleId}/service-history`,
    );
  }

  create(dto: CreateClientDto): Observable<Client> {
    return this.http.post<Client>(API_URL, dto);
  }

  update(id: string, dto: Partial<CreateClientDto>): Observable<Client> {
    return this.http.patch<Client>(`${API_URL}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<{ deleted: boolean }>(`${API_URL}/${id}`)
      .pipe(map(() => undefined));
  }

  getDisplayName(client: Client): string {
    if (client.companyName) return client.companyName;
    const parts = [client.firstName, client.lastName].filter(Boolean);
    return parts.join(" ") || client.phone;
  }
}
