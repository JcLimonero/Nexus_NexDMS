import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export type SalesApptPurpose = "TEST_DRIVE" | "DELIVERY" | "VISIT" | "FOLLOW_UP";
export type SalesApptStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "DONE"
  | "CANCELLED"
  | "NO_SHOW";

export interface SalesAppointment {
  id: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string | null;
  sellerId: string | null;
  catalogUnitId: string | null;
  unitLabel: string | null;
  purpose: SalesApptPurpose;
  status: SalesApptStatus;
  scheduledAt: string;
  durationMin: number;
  notes: string | null;
  createdAt: string;
}

export interface CreateSalesAppointmentDto {
  branchId?: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  sellerId?: string;
  catalogUnitId?: string;
  unitLabel?: string;
  purpose: SalesApptPurpose;
  scheduledAt: string;
  durationMin?: number;
  notes?: string;
}

const URL = "/api/v1/sales-appointments";

@Injectable({ providedIn: "root" })
export class CitasVentasService {
  private http = inject(HttpClient);

  getAll(status?: SalesApptStatus): Observable<SalesAppointment[]> {
    const q = status ? `?status=${status}` : "";
    return this.http.get<SalesAppointment[]>(`${URL}${q}`);
  }

  create(dto: CreateSalesAppointmentDto): Observable<SalesAppointment> {
    return this.http.post<SalesAppointment>(URL, dto);
  }

  updateStatus(
    id: string,
    status: SalesApptStatus
  ): Observable<SalesAppointment> {
    return this.http.patch<SalesAppointment>(`${URL}/${id}/status`, { status });
  }
}
