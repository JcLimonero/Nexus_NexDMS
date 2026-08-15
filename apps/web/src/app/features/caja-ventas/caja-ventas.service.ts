import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import {
  CashSession,
  CashSessionsResponse,
  CashSessionFilters,
  OpenCashSessionDto,
  CloseCashSessionDto,
  MovimientoCaja,
} from "./models/cash-session.model";
import {
  Sale,
  SalesResponse,
  SaleFilters,
  CreateSaleDto,
} from "./models/sale.model";
import {
  PriceList,
  PriceListFilters,
  CreatePriceListDto,
} from "./models/price-list.model";

const CASH_REGISTER_URL = "/api/v1/cash-register";
const SALES_URL = "/api/v1/sales";
const PRICE_LISTS_URL = "/api/v1/price-lists";

@Injectable({
  providedIn: "root",
})
export class CajaVentasService {
  private http = inject(HttpClient);

  // Caja
  getActiveSession(branchId: string): Observable<CashSession> {
    return this.http.get<CashSession>(
      `${CASH_REGISTER_URL}/active-session`,
      { params: { branchId } }
    );
  }

  openSession(dto: OpenCashSessionDto): Observable<CashSession> {
    return this.http.post<CashSession>(`${CASH_REGISTER_URL}/open`, dto);
  }

  closeSession(branchId: string, dto: CloseCashSessionDto): Observable<CashSession> {
    return this.http.post<CashSession>(
      `${CASH_REGISTER_URL}/close`,
      dto,
      { params: { branchId } }
    );
  }

  getSessions(
    filters: CashSessionFilters = {}
  ): Observable<CashSessionsResponse> {
    let params = new HttpParams();
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<CashSessionsResponse>(
      `${CASH_REGISTER_URL}/sessions`,
      { params }
    );
  }

  getSession(id: string): Observable<CashSession> {
    return this.http.get<CashSession>(`${CASH_REGISTER_URL}/sessions/${id}`);
  }

  // ── Movimientos manuales de efectivo ──
  registrarMovimiento(
    branchId: string,
    dto: {
      kind: "DEPOSIT" | "WITHDRAWAL" | "EXPENSE";
      amount: number;
      concept: string;
      reference?: string;
    },
  ): Observable<unknown> {
    return this.http.post(`${CASH_REGISTER_URL}/movements`, dto, {
      params: { branchId },
    });
  }

  getMovimientos(sessionId: string): Observable<MovimientoCaja[]> {
    return this.http.get<MovimientoCaja[]>(
      `${CASH_REGISTER_URL}/sessions/${sessionId}/movements`,
    );
  }

  /** Corte imprimible; se pide como blob por la credencial en la cabecera. */
  corte(sessionId: string): Observable<Blob> {
    return this.http.get(`${CASH_REGISTER_URL}/sessions/${sessionId}/corte`, {
      responseType: "blob",
    });
  }

  getSessionStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      OPEN: "Abierta",
      CLOSED: "Cerrada",
    };
    return labels[status] ?? status;
  }

  // Ventas
  getSales(filters: SaleFilters = {}): Observable<SalesResponse> {
    let params = new HttpParams();
    if (filters.clientId) params = params.set("clientId", filters.clientId);
    if (filters.status) params = params.set("status", filters.status);
    if (filters.cashSessionId)
      params = params.set("cashSessionId", filters.cashSessionId);
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<SalesResponse>(SALES_URL, { params });
  }

  getSale(id: string): Observable<Sale> {
    return this.http.get<Sale>(`${SALES_URL}/${id}`);
  }

  createSale(dto: CreateSaleDto): Observable<Sale> {
    return this.http.post<Sale>(SALES_URL, dto);
  }

  cancelSale(id: string, reason?: string): Observable<Sale> {
    return this.http.post<Sale>(`${SALES_URL}/${id}/cancel`, { reason });
  }

  getSaleStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      OPEN: "Abierta",
      PAID: "Pagada",
      CANCELLED: "Cancelada",
    };
    return labels[status] ?? status;
  }

  getPriceListLabel(type: string): string {
    const labels: Record<string, string> = {
      PUBLIC: "Público",
      WHOLESALE: "Mayoreo",
      BUSINESS: "Empresa",
    };
    return labels[type] ?? type;
  }

  // Listas de precio
  getPriceLists(filters: PriceListFilters = {}): Observable<PriceList[]> {
    let params = new HttpParams();
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.isActive !== undefined)
      params = params.set("isActive", String(filters.isActive));
    return this.http.get<PriceList[]>(PRICE_LISTS_URL, { params });
  }

  getPriceList(id: string): Observable<PriceList> {
    return this.http.get<PriceList>(`${PRICE_LISTS_URL}/${id}`);
  }

  createPriceList(dto: CreatePriceListDto): Observable<PriceList> {
    return this.http.post<PriceList>(PRICE_LISTS_URL, dto);
  }

  updatePriceList(
    id: string,
    dto: Partial<CreatePriceListDto>
  ): Observable<PriceList> {
    return this.http.patch<PriceList>(`${PRICE_LISTS_URL}/${id}`, dto);
  }

  deletePriceList(id: string): Observable<void> {
    return this.http
      .delete(`${PRICE_LISTS_URL}/${id}`)
      .pipe(map(() => undefined));
  }
}
