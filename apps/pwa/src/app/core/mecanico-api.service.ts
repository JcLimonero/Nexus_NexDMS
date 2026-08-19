import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

const SO_URL = "/api/v1/service-orders";
const APPT_URL = "/api/v1/appointments";
const OPS_URL = "/api/v1/operations";

/** Una línea de trabajo de la orden, con el tiempo ya acumulado. */
export interface Operacion {
  id: string;
  code: string | null;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  chargeType: string;
  standardMinutes: number;
  ownMinutes: number;
  othersMinutes: number;
  totalMinutes: number;
  deviationMinutes: number | null;
  running: boolean;
  runningSince: string | null;
  mechanicName: string | null;
}

export interface FichajeActual {
  fichado: boolean;
  serviceOrderId?: string;
  folio?: string;
  operationId?: string | null;
  operacion?: string;
  desde?: string;
  minutos?: number;
}

export interface MyAppointment {
  id: string;
  status: string;
  serviceType: string;
  clientName: string;
  scheduledAt: string;
  durationMin: number;
  client?: { firstName?: string; lastName?: string; companyName?: string };
  vehicle?: { brand?: string; model?: string; plate?: string };
}

export interface MyServiceOrder {
  id: string;
  folio?: string;
  status: string;
  reportedFault?: string;
  kmIn?: number;
  createdAt: string;
  client?: { firstName?: string; lastName?: string; companyName?: string };
  vehicle?: {
    brand?: string;
    make?: string;
    model?: string;
    plate?: string;
    year?: number;
  };
  parts?: {
    id: string;
    quantity: number;
    part?: { name?: string; sku?: string };
    notes?: string;
  }[];
}

export interface TimeEntry {
  id: string;
  mechanicId: string;
  startedAt: string;
  endedAt: string | null;
  minutes: number;
}

/** El endpoint /time regresa un resumen por técnico. */
export interface TimeSummary {
  mechanicId: string;
  totalMinutes: number;
  entries: TimeEntry[];
}

export interface OrderUpdate {
  id: string;
  message?: string;
  comment?: string;
  createdAt: string;
}

@Injectable({ providedIn: "root" })
export class MecanicoApiService {
  private http = inject(HttpClient);

  /** Citas del día — la API filtra por el técnico logueado (rol MECHANIC). */
  getMyAppointmentsToday(): Observable<{ data: MyAppointment[] }> {
    const today = new Date().toISOString().slice(0, 10);
    const params = new HttpParams()
      .set("dateFrom", today)
      .set("dateTo", today)
      .set("limit", "50");
    return this.http.get<{ data: MyAppointment[] }>(APPT_URL, { params });
  }

  /** Órdenes activas — la API limita a las del técnico logueado. */
  getMyOrders(): Observable<{ data: MyServiceOrder[] }> {
    const params = new HttpParams().set("limit", "50");
    return this.http.get<{ data: MyServiceOrder[] }>(SO_URL, { params });
  }

  getOrder(id: string): Observable<MyServiceOrder> {
    return this.http.get<MyServiceOrder>(`${SO_URL}/${id}`);
  }

  changeStatus(id: string, status: string): Observable<MyServiceOrder> {
    return this.http.post<MyServiceOrder>(`${SO_URL}/${id}/change-status`, {
      status,
    });
  }

  startTime(id: string): Observable<unknown> {
    return this.http.post(`${SO_URL}/${id}/time/start`, {});
  }

  pauseTime(id: string): Observable<unknown> {
    return this.http.post(`${SO_URL}/${id}/time/pause`, {});
  }

  getTimeSummary(id: string): Observable<TimeSummary[]> {
    return this.http.get<TimeSummary[]>(`${SO_URL}/${id}/time`);
  }

  // ─── Operaciones y fichaje ────────────────────────────────
  // El tiempo se lleva por operación, no por orden: es lo que permite
  // comparar contra el baremo y saber quién más está en el mismo trabajo.

  getOperaciones(serviceOrderId: string): Observable<Operacion[]> {
    return this.http.get<Operacion[]>(`${OPS_URL}/order/${serviceOrderId}`);
  }

  fichajeActual(): Observable<FichajeActual> {
    return this.http.get<FichajeActual>(`${OPS_URL}/fichaje-actual`);
  }

  ficharOperacion(operationId: string): Observable<unknown> {
    return this.http.post(`${OPS_URL}/${operationId}/fichar`, {});
  }

  pausarOperacion(operationId: string): Observable<unknown> {
    return this.http.post(`${OPS_URL}/${operationId}/pausar`, {});
  }

  terminarOperacion(operationId: string): Observable<unknown> {
    return this.http.post(`${OPS_URL}/${operationId}/terminar`, {});
  }

  getUpdates(id: string): Observable<OrderUpdate[]> {
    return this.http.get<OrderUpdate[]>(`${SO_URL}/${id}/updates`);
  }

  addUpdate(id: string, message: string): Observable<unknown> {
    return this.http.post(`${SO_URL}/${id}/updates`, { message });
  }

  /**
   * El hallazgo exige evidencia: multipart con campo `file`.
   * La criticidad y el tiempo estimado son lo que el asesor necesita para
   * defender el trabajo adicional por teléfono y replanificar la entrega.
   */
  addFinding(
    id: string,
    description: string,
    file: File,
    extra?: { criticality?: string; estimatedMinutes?: number },
  ): Observable<unknown> {
    const form = new FormData();
    form.append("description", description);
    form.append("file", file);
    if (extra?.criticality) form.append("criticality", extra.criticality);
    if (extra?.estimatedMinutes != null) {
      form.append("estimatedMinutes", String(extra.estimatedMinutes));
    }
    return this.http.post(`${SO_URL}/${id}/findings`, form);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      RECEIVED: "Recibida",
      DIAGNOSIS: "Diagnóstico",
      IN_PROGRESS: "En progreso",
      WAITING_PARTS: "Esperando refacciones",
      READY: "Lista",
      DELIVERED: "Entregada",
      CANCELLED: "Cancelada",
      PENDING_CONFIRMATION: "Por confirmar",
      SCHEDULED: "Agendada",
      CONFIRMED: "Confirmada",
      COMPLETED: "Completada",
    };
    return labels[status] ?? status;
  }
}
