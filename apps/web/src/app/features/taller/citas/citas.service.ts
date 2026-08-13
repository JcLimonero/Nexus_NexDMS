import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

const APPOINTMENTS_URL = "/api/v1/appointments";
const USER_AVAILABILITY_URL = "/api/v1/user-availability";

export type AppointmentStatus =
  | "PENDING_CONFIRMATION"
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Appointment {
  id: string;
  branchId: string;
  clientId?: string;
  vehicleId?: string;
  mechanicId?: string;
  origin: "INTERNAL" | "PUBLIC_PORTAL";
  status: AppointmentStatus;
  serviceType: string;
  serviceTypeId?: string;
  clientName: string;
  clientPhone: string;
  notes?: string;
  scheduledAt: string;
  durationMin: number;
  client?: { id: string; firstName?: string; lastName?: string; companyName?: string };
  vehicle?: { id: string; brand?: string; model?: string; plate?: string };
  mechanic?: { id: string; firstName: string; lastName: string };
}

export interface AppointmentsResponse {
  data: Appointment[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateAppointmentDto {
  clientId?: string;
  vehicleId?: string;
  mechanicId?: string;
  branchId: string;
  origin: "INTERNAL";
  serviceType: string;
  serviceTypeId?: string;
  clientName?: string;
  clientPhone?: string;
  notes?: string;
  scheduledAt: string;
  durationMin?: number;
}

export interface AvailableSlot {
  start: string;
  end: string;
  mechanicId?: string;
}

@Injectable({ providedIn: "root" })
export class CitasService {
  private http = inject(HttpClient);

  getAppointments(filters: {
    branchId?: string;
    mechanicId?: string;
    status?: AppointmentStatus;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Observable<AppointmentsResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") {
        params = params.set(k, String(v));
      }
    }
    return this.http.get<AppointmentsResponse>(APPOINTMENTS_URL, { params });
  }

  create(dto: CreateAppointmentDto): Observable<Appointment> {
    return this.http.post<Appointment>(APPOINTMENTS_URL, dto);
  }

  confirm(id: string): Observable<Appointment> {
    return this.http.post<Appointment>(`${APPOINTMENTS_URL}/${id}/confirm`, {});
  }

  cancel(id: string, reason?: string): Observable<Appointment> {
    return this.http.post<Appointment>(`${APPOINTMENTS_URL}/${id}/cancel`, {
      reason,
    });
  }

  complete(id: string): Observable<Appointment> {
    return this.http.post<Appointment>(
      `${APPOINTMENTS_URL}/${id}/complete`,
      {},
    );
  }

  /** Slots disponibles del día por técnico (sin mechanicId regresa todos). */
  getSlots(
    branchId: string,
    date: string,
    opts: { serviceTypeId?: string; durationMin?: number } = {},
  ): Observable<AvailableSlot[]> {
    let params = new HttpParams().set("branchId", branchId).set("date", date);
    if (opts.serviceTypeId) params = params.set("serviceTypeId", opts.serviceTypeId);
    if (opts.durationMin) params = params.set("durationMin", String(opts.durationMin));
    return this.http.get<AvailableSlot[]>(`${USER_AVAILABILITY_URL}/slots`, {
      params,
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING_CONFIRMATION: "Por confirmar",
      SCHEDULED: "Agendada",
      CONFIRMED: "Confirmada",
      COMPLETED: "Completada",
      CANCELLED: "Cancelada",
      NO_SHOW: "No asistió",
    };
    return labels[status] ?? status;
  }
}
