import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

const RECEPCION_URL = "/api/v1/reception";
const BRANCHES_URL = "/api/v1/branches";

/** Una cita del día lista para recibir. */
export interface CitaDelDia {
  id: string;
  scheduledAt: string;
  serviceType: string;
  status: string;
  clientName: string;
  clientPhone: string;
  vehicle: {
    id: string;
    label: string;
    plate: string | null;
    vehicleType: string;
  } | null;
  advisorId: string | null;
  advisorName: string | null;
  mechanicName: string | null;
  recibida: boolean;
  serviceOrderId: string | null;
  serviceOrderFolio: string | null;
}

export interface Sucursal {
  id: string;
  name: string;
}

@Injectable({ providedIn: "root" })
export class RecepcionApiService {
  private http = inject(HttpClient);

  sucursales(): Observable<{ data: Sucursal[] }> {
    return this.http.get<{ data: Sucursal[] }>(BRANCHES_URL, {
      params: new HttpParams().set("limit", "100"),
    });
  }

  /**
   * Agenda del día. `soloMias` deja únicamente las citas asignadas al asesor
   * —más las que aún no tienen dueño, que alguien tiene que atender.
   */
  agenda(
    branchId: string,
    date: string,
    soloMias = true,
  ): Observable<CitaDelDia[]> {
    const params = new HttpParams()
      .set("branchId", branchId)
      .set("date", date)
      .set("soloMias", String(soloMias));
    return this.http.get<CitaDelDia[]>(`${RECEPCION_URL}/agenda`, { params });
  }

  /**
   * Recepción sin cita (walk-in): el cliente llega sin agendar. Da de alta (o
   * reutiliza) cliente y unidad y abre la orden en Recibida, sin cita.
   */
  recibirSinCita(dto: {
    branchId: string;
    cliente: { firstName: string; lastName?: string; phone: string };
    vehiculo: {
      vehicleType: string;
      make: string;
      model: string;
      year?: number;
      plate?: string;
      color?: string;
      mileage?: number;
    };
    reportedFault?: string;
    kmIn?: number;
  }): Observable<{ id: string; folio: string }> {
    return this.http.post<{ id: string; folio: string }>(
      `${RECEPCION_URL}/walk-in`,
      dto,
    );
  }
}
