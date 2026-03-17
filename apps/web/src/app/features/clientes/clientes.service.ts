import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, map, tap } from "rxjs";
import {
  Client,
  ClientDetail,
  ClientFilters,
  ClientsResponse,
  CreateClientDto,
} from "./models/client.model";

const API_URL = "/api/v1/clients";

@Injectable({
  providedIn: "root",
})
export class ClientesService {
  private http = inject(HttpClient);
  // #region agent log
  private _dbgReqCount = 0;
  private _dbgLog(msg: string, data: Record<string, unknown>) {
    fetch('http://127.0.0.1:7581/ingest/bcde24cd-a710-4919-a588-2e9c9447588e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b8cd5e' }, body: JSON.stringify({ sessionId: 'b8cd5e', location: 'clientes.service.ts', message: msg, data, timestamp: Date.now() }) }).catch(() => {});
  }
  // #endregion

  getAll(filters: ClientFilters = {}): Observable<ClientsResponse> {
    let params = new HttpParams();
    if (filters.search) params = params.set("search", filters.search);
    if (filters.clientType) params = params.set("clientType", filters.clientType);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());

    const reqSeq = ++this._dbgReqCount;
    return this.http.get<ClientsResponse>(API_URL, { params }).pipe(
      // #region agent log
      tap({
        next: () => this._dbgLog('clientes getAll success', { reqSeq }),
        error: (err) => this._dbgLog('clientes getAll error', { reqSeq, error: err?.message || String(err) }),
      }),
      // #endregion
    );
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
