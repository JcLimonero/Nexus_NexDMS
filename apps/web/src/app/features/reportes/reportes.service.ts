import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  CommissionPeriod,
  CommissionPeriodFilters,
  CommissionPeriodsResponse,
  CreateCommissionPeriodDto,
} from "./models/commission.model";

const COMMISSIONS_URL = "/api/v1/commissions";

@Injectable({
  providedIn: "root",
})
export class ReportesService {
  private http = inject(HttpClient);

  getCommissionPeriods(
    filters: CommissionPeriodFilters = {}
  ): Observable<CommissionPeriodsResponse> {
    let params = new HttpParams();
    if (filters.branchId) params = params.set("branchId", filters.branchId);
    if (filters.status) params = params.set("status", filters.status);
    if (filters.type) params = params.set("type", filters.type);
    if (filters.page) params = params.set("page", filters.page.toString());
    if (filters.limit) params = params.set("limit", filters.limit.toString());
    return this.http.get<CommissionPeriodsResponse>(
      `${COMMISSIONS_URL}/periods`,
      { params }
    );
  }

  getCommissionPeriod(id: string): Observable<CommissionPeriod> {
    return this.http.get<CommissionPeriod>(`${COMMISSIONS_URL}/periods/${id}`);
  }

  createCommissionPeriod(dto: CreateCommissionPeriodDto): Observable<CommissionPeriod> {
    return this.http.post<CommissionPeriod>(`${COMMISSIONS_URL}/periods`, dto);
  }

  submitForReview(id: string): Observable<CommissionPeriod> {
    return this.http.post<CommissionPeriod>(
      `${COMMISSIONS_URL}/periods/${id}/submit-review`,
      {}
    );
  }

  approvePeriod(id: string): Observable<CommissionPeriod> {
    return this.http.post<CommissionPeriod>(
      `${COMMISSIONS_URL}/periods/${id}/approve`,
      {}
    );
  }

  markAsPaid(id: string): Observable<CommissionPeriod> {
    return this.http.post<CommissionPeriod>(
      `${COMMISSIONS_URL}/periods/${id}/mark-paid`,
      {}
    );
  }

  getPeriodStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      OPEN: "Abierto",
      UNDER_REVIEW: "En revisión",
      APPROVED: "Aprobado",
      PAID: "Pagado",
    };
    return labels[status] ?? status;
  }

  getPeriodTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      BIWEEKLY: "Quincenal",
      MONTHLY: "Mensual",
    };
    return labels[type] ?? type;
  }
}
