import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  Quotation,
  QuotationFilters,
  QuotationResponse,
  CreateQuotationDto,
} from "./models/quotation.model";

const QUOTATIONS_URL = "/api/v1/quotations";

@Injectable({
  providedIn: "root",
})
export class CotizacionesService {
  private http = inject(HttpClient);

  getQuotations(filters: QuotationFilters = {}): Observable<QuotationResponse> {
    let params = new HttpParams();
    if (filters.type) params = params.set("type", filters.type);
    if (filters.status) params = params.set("status", filters.status);
    if (filters.clientId) params = params.set("clientId", filters.clientId);
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.dateFrom) params = params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params = params.set("dateTo", filters.dateTo);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<QuotationResponse>(QUOTATIONS_URL, { params });
  }

  getQuotation(id: string): Observable<Quotation> {
    return this.http.get<Quotation>(`${QUOTATIONS_URL}/${id}`);
  }

  createQuotation(dto: CreateQuotationDto): Observable<Quotation> {
    return this.http.post<Quotation>(QUOTATIONS_URL, dto);
  }

  updateQuotation(id: string, dto: Partial<CreateQuotationDto>): Observable<Quotation> {
    return this.http.patch<Quotation>(`${QUOTATIONS_URL}/${id}`, dto);
  }

  approveQuotation(id: string): Observable<Quotation> {
    return this.http.post<Quotation>(`${QUOTATIONS_URL}/${id}/approve`, {});
  }

  rejectQuotation(id: string, reason?: string): Observable<Quotation> {
    return this.http.post<Quotation>(`${QUOTATIONS_URL}/${id}/reject`, { reason });
  }

  sendQuotation(id: string): Observable<Quotation> {
    return this.http.post<Quotation>(`${QUOTATIONS_URL}/${id}/send`, {});
  }

  convertQuotation(id: string): Observable<{ type: string; id?: string }> {
    return this.http.post<{ type: string; id?: string }>(
      `${QUOTATIONS_URL}/${id}/convert`,
      {}
    );
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      PARTS: "Refacciones",
      SERVICE: "Servicio",
      UNIT: "Unidad",
    };
    return labels[type] ?? type;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: "Borrador",
      PENDING_APPROVAL: "Pendiente aprobación",
      APPROVED: "Aprobada",
      SENT: "Enviada",
      ACCEPTED: "Aceptada",
      REJECTED: "Rechazada",
      EXPIRED: "Expirada",
      CONVERTED: "Convertida",
    };
    return labels[status] ?? status;
  }

  getPriceListLabel(priceList: string): string {
    const labels: Record<string, string> = {
      PUBLIC: "Público",
      WHOLESALE: "Mayoreo",
      BUSINESS: "Empresa",
    };
    return labels[priceList] ?? priceList;
  }
}
