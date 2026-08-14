import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map } from "rxjs";

const URL = "/api/v1/reception/evidencia";

export interface MarcaEvidencia {
  id: string;
  type: string;
  shape: "POINT" | "CIRCLE";
  note: string | null;
  x: number;
  y: number;
  radius: number | null;
}

export interface FotoEvidencia {
  id: string;
  specCode: string | null;
  /** Nombre del catálogo ("Frente"), no el código. */
  nombre: string | null;
  mediaType: string;
  /** Liga firmada y temporal. Nula si el almacenamiento no está configurado. */
  url: string | null;
  marks: MarcaEvidencia[];
}

/** Cómo llegó la unidad en una visita concreta. */
export interface VisitaEvidencia {
  serviceOrderId: string;
  folio: string;
  recibidaEl: string | null;
  kmIn: number | null;
  damageDescription: string | null;
  fotos: FotoEvidencia[];
}

/** Evidencia de una unidad del cliente, con todas sus visitas. */
export interface UnidadEvidencia {
  vehicleId: string;
  descripcion: string;
  plate: string | null;
  visitas: VisitaEvidencia[];
}

interface EvidenciaOrden {
  folio: string;
  recibidaEl: string | null;
  checklist: {
    kmIn: number;
    damageDescription: string | null;
  } | null;
  fotos: FotoEvidencia[];
}

/**
 * Consulta de la evidencia de recepción.
 *
 * Todo se normaliza a una lista de visitas, aunque se pregunte por una sola
 * orden: así la plantilla es una y no tres, y una unidad con dos visitas se
 * lee igual que una con una.
 */
@Injectable({ providedIn: "root" })
export class EvidenciaRecepcionService {
  private http = inject(HttpClient);

  private deOrdenAVisita(d: EvidenciaOrden, id: string): VisitaEvidencia[] {
    if (!d.fotos.length) return [];
    return [
      {
        serviceOrderId: id,
        folio: d.folio,
        recibidaEl: d.recibidaEl,
        kmIn: d.checklist?.kmIn ?? null,
        damageDescription: d.checklist?.damageDescription ?? null,
        fotos: d.fotos,
      },
    ];
  }

  deOrden(serviceOrderId: string): Observable<VisitaEvidencia[]> {
    return this.http
      .get<EvidenciaOrden>(`${URL}/orden/${serviceOrderId}`)
      .pipe(map((d) => this.deOrdenAVisita(d, serviceOrderId)));
  }

  deVehiculo(vehicleId: string): Observable<VisitaEvidencia[]> {
    return this.http.get<VisitaEvidencia[]>(`${URL}/vehiculo/${vehicleId}`);
  }

  deCliente(clientId: string): Observable<UnidadEvidencia[]> {
    return this.http.get<UnidadEvidencia[]>(`${URL}/cliente/${clientId}`);
  }

  /**
   * La misma evidencia, para el cliente, por la liga que ya recibió.
   *
   * Va por otro camino porque no hay sesión que valga: el token es lo único
   * que él tiene, y limita lo que puede pedir a su propia orden.
   */
  deTokenPublico(token: string): Observable<VisitaEvidencia[]> {
    return this.http
      .get<EvidenciaOrden>(`/api/v1/public/tracking/${token}/evidencia`)
      .pipe(map((d) => this.deOrdenAVisita(d, token)));
  }
}

/** Etiquetas de los tipos de daño, iguales que en la recepción. */
export const ETIQUETAS_DANO: Record<string, string> = {
  SCRATCH: "Rayón",
  DENT: "Golpe",
  BROKEN: "Roto",
  MISSING: "Faltante",
  WEAR: "Desgaste",
  OTHER: "Otro",
};
