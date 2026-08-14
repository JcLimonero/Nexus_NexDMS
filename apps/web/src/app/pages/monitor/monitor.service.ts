import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

/** Cómo va una unidad respecto a lo que se estimó. */
export type Semaforo = "en-tiempo" | "por-vencer" | "excedido" | "sin-empezar";

export interface UnidadEnTablero {
  ordenId: string;
  folio: string;
  cliente: string;
  vehiculo: string;
  placa: string | null;
  estado: string;
  faseActual: string | null;
  faseSecuencia: number | null;
  fasesTotales: number;
  fasesTerminadas: number;
  responsable: string | null;
  minutosEnFase: number | null;
  estimadoFase: number | null;
  minutosTotales: number;
  estimadoTotal: number;
  semaforo: Semaforo;
  retraso: number;
}

export interface CitaDelDia {
  id: string;
  scheduledAt: string;
  clientName: string;
  serviceType: string;
  status: string;
  vehiculo?: string;
  advisorId?: string | null;
}

@Injectable({ providedIn: "root" })
export class MonitorService {
  private http = inject(HttpClient);

  tablero(branchId: string): Observable<UnidadEnTablero[]> {
    return this.http.get<UnidadEnTablero[]>(
      `/api/v1/service-phases/tablero?branchId=${branchId}`,
    );
  }

  /** El calendario pide rango; para el día se piden ambos extremos iguales. */
  citasDelDia(branchId: string, date: string): Observable<CitaDelDia[]> {
    return this.http.get<CitaDelDia[]>(
      `/api/v1/appointments/calendar?branchId=${branchId}&dateFrom=${date}&dateTo=${date}`,
    );
  }
}
