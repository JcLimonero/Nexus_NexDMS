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

/** Un trabajo colocado en la hora en que ocurrió. */
export interface BloqueMagneto {
  faseId: string;
  ordenId: string;
  folio: string;
  vehiculo: string;
  placa: string | null;
  fase: string;
  secuencia: number;
  estado: string;
  tecnicoId: string | null;
  inicio: string;
  fin: string | null;
  estimadoMin: number;
  transcurridoMin: number;
  semaforo: Semaforo;
}

export interface Magneto {
  fecha: string;
  /** Hora del servidor: la pantalla no se fía de su propio reloj. */
  ahora: string;
  tecnicos: {
    id: string;
    nombre: string;
    iniciales: string;
    disponible: boolean;
    motivo: string | null;
    ventanas: { inicio: string; fin: string }[];
    bloques: BloqueMagneto[];
  }[];
  sinAsignar: BloqueMagneto[];
  enEspera: {
    ordenId: string;
    folio: string;
    vehiculo: string;
    placa: string | null;
    estado: string;
    fases: number;
    estimadoMin: number;
    desde: string;
  }[];
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
  magneto(branchId: string, date: string): Observable<Magneto> {
    return this.http.get<Magneto>(
      `/api/v1/service-phases/magneto?branchId=${branchId}&date=${date}`,
    );
  }

  citasDelDia(branchId: string, date: string): Observable<CitaDelDia[]> {
    return this.http.get<CitaDelDia[]>(
      `/api/v1/appointments/calendar?branchId=${branchId}&dateFrom=${date}&dateTo=${date}`,
    );
  }
}
