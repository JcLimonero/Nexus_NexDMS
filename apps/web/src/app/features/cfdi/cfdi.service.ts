import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  CfdiLog,
  CfdiDetail,
  CfdiFilters,
  CfdiResponse,
  CancelCfdiDto,
  RegisterPagoDto,
} from "./models/cfdi-log.model";

const CFDI_URL = "/api/v1/cfdi";

@Injectable({
  providedIn: "root",
})
export class CfdiService {
  private http = inject(HttpClient);

  getCfdis(filters: CfdiFilters = {}): Observable<CfdiResponse> {
    let params = new HttpParams();
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.tipo) params = params.set("tipo", filters.tipo);
    if (filters.status) params = params.set("status", filters.status);
    if (filters.fechaDesde) params = params.set("fechaDesde", filters.fechaDesde);
    if (filters.fechaHasta) params = params.set("fechaHasta", filters.fechaHasta);
    if (filters.referenceId) params = params.set("referenceId", filters.referenceId);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<CfdiResponse>(CFDI_URL, { params });
  }

  getCfdi(id: string): Observable<CfdiDetail> {
    return this.http.get<CfdiDetail>(`${CFDI_URL}/${id}`);
  }

  cancelCfdi(id: string, dto: CancelCfdiDto): Observable<CfdiLog> {
    return this.http.post<CfdiLog>(`${CFDI_URL}/${id}/cancelar`, dto);
  }

  resendCfdi(id: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${CFDI_URL}/${id}/reenviar`, {});
  }

  registerPago(id: string, dto: RegisterPagoDto): Observable<CfdiLog> {
    return this.http.post<CfdiLog>(`${CFDI_URL}/pago/${id}`, dto);
  }

  generarIngreso(
    referenceType: "Sale" | "ServiceOrder" | "UnitSale",
    referenceId: string
  ): Observable<CfdiLog> {
    return this.http.post<CfdiLog>(
      `${CFDI_URL}/generar/${referenceType}/${referenceId}`,
      {}
    );
  }

  notaCredito(
    id: string,
    dto: { motivo: string; monto?: number }
  ): Observable<CfdiLog> {
    return this.http.post<CfdiLog>(`${CFDI_URL}/${id}/nota-credito`, dto);
  }

  facturaGlobal(dto: {
    branchId: string;
    year: number;
    month: number;
    periodicity?: string;
  }): Observable<{ cfdi: CfdiLog; incluidas: number; total: number }> {
    return this.http.post<{ cfdi: CfdiLog; incluidas: number; total: number }>(
      `${CFDI_URL}/global`,
      dto
    );
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      INCOME: "Ingreso",
      EXPENSE: "Egreso",
      PAYMENT: "Pago",
    };
    return labels[type] ?? type;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      VALID: "Vigente",
      CANCELLED: "Cancelado",
    };
    return labels[status] ?? status;
  }

  getReferenceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      Sale: "Venta POS",
      ServiceOrder: "Orden de servicio",
      UnitSale: "Venta de unidad",
    };
    return labels[type] ?? type;
  }
}
