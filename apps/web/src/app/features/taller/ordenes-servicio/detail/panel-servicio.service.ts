import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

/** Un trabajo adicional detectado por el técnico durante el servicio. */
export interface Hallazgo {
  id: string;
  description: string;
  criticality: "BAJA" | "MEDIA" | "ALTA";
  status: "PENDIENTE" | "COTIZADO" | "AUTORIZADO" | "RECHAZADO";
  estimatedMinutes: number;
  estimatedAmount: number;
  mediaType: "PHOTO" | "VIDEO";
  mediaKey: string;
  createdAt: string;
  tecnico: string | null;
  cotizacion: {
    id: string;
    folio: string;
    total: number;
    status: string;
    clientToken: string;
    respondida: boolean;
  } | null;
}

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
  mechanicName: string | null;
}

export interface Firma {
  kind: "CLIENT_QUOTE" | "CLIENT_CONFORME" | "ADVISOR";
  label: string;
  firmada: boolean;
  mode: string | null;
  signerName: string | null;
  signedAt: string | null;
  imageKey: string | null;
  token: string | null;
}

export interface Mensaje {
  id: string;
  sender: "CLIENT" | "STAFF";
  body: string;
  createdAt: string;
  leido: boolean;
}

export interface UnidadSustitucion {
  id: string;
  descripcion: string;
  placa: string | null;
}

export interface TipoCargo {
  value: string;
  label: string;
}

/**
 * Todo lo que el asesor hace sobre una orden abierta: desglosar el trabajo,
 * cotizar lo que encontró el técnico, recoger firmas, hablar con el cliente
 * y prestarle una unidad mientras tanto.
 */
@Injectable({ providedIn: "root" })
export class PanelServicioService {
  private http = inject(HttpClient);

  // ── Trabajos adicionales ──
  hallazgos(serviceOrderId: string): Observable<Hallazgo[]> {
    return this.http.get<Hallazgo[]>(
      `/api/v1/additional-work/order/${serviceOrderId}`,
    );
  }

  cotizarHallazgos(
    serviceOrderId: string,
    findingIds: string[],
    lines: { description: string; quantity: number; unitPrice: number }[],
    conditions?: string,
  ): Observable<{ folio: string; total: number; clientToken: string }> {
    return this.http.post<{ folio: string; total: number; clientToken: string }>(
      `/api/v1/additional-work/order/${serviceOrderId}/quote`,
      { findingIds, lines, conditions },
    );
  }

  // ── Operaciones y tipos de cargo ──
  operaciones(serviceOrderId: string): Observable<Operacion[]> {
    return this.http.get<Operacion[]>(
      `/api/v1/operations/order/${serviceOrderId}`,
    );
  }

  tiposCargo(): Observable<TipoCargo[]> {
    return this.http.get<TipoCargo[]>("/api/v1/operations/charge-types");
  }

  agregarOperacion(
    serviceOrderId: string,
    dto: {
      code?: string;
      description: string;
      standardMinutes?: number;
      laborPrice?: number;
      chargeType?: string;
      chargeAccount?: string;
    },
  ): Observable<unknown> {
    return this.http.post(`/api/v1/operations/order/${serviceOrderId}`, dto);
  }

  quitarOperacion(operationId: string): Observable<unknown> {
    return this.http.delete(`/api/v1/operations/${operationId}`);
  }

  productividad(serviceOrderId: string): Observable<{
    operaciones: number;
    minutosBaremo: number;
    minutosReales: number;
    eficiencia: number | null;
    cerradas: number;
  }> {
    return this.http.get<{
      operaciones: number;
      minutosBaremo: number;
      minutosReales: number;
      eficiencia: number | null;
      cerradas: number;
    }>(`/api/v1/operations/order/${serviceOrderId}/productividad`);
  }

  // ── Firmas ──
  firmas(serviceOrderId: string): Observable<Firma[]> {
    return this.http.get<Firma[]>(`/api/v1/signatures/order/${serviceOrderId}`);
  }

  firmarPresencial(
    serviceOrderId: string,
    kind: string,
    dataUrl: string,
    signerName?: string,
  ): Observable<unknown> {
    return this.http.post(
      `/api/v1/signatures/order/${serviceOrderId}/presencial`,
      { kind, dataUrl, signerName },
    );
  }

  solicitarFirmaRemota(
    serviceOrderId: string,
    kind: string,
  ): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(
      `/api/v1/signatures/order/${serviceOrderId}/remota`,
      { kind },
    );
  }

  // ── Conversación ──
  mensajes(serviceOrderId: string): Observable<Mensaje[]> {
    return this.http.get<Mensaje[]>(
      `/api/v1/client-chat/order/${serviceOrderId}`,
    );
  }

  responder(serviceOrderId: string, body: string): Observable<unknown> {
    return this.http.post(`/api/v1/client-chat/order/${serviceOrderId}`, {
      body,
    });
  }

  // ── Vehículo de sustitución ──
  unidadesSustitucion(): Observable<UnidadSustitucion[]> {
    return this.http.get<UnidadSustitucion[]>(
      "/api/v1/operations/sustitucion/disponibles",
    );
  }

  prestarUnidad(
    serviceOrderId: string,
    catalogUnitId: string,
  ): Observable<unknown> {
    return this.http.post(
      `/api/v1/operations/order/${serviceOrderId}/sustitucion`,
      { catalogUnitId },
    );
  }

  devolverUnidad(serviceOrderId: string): Observable<unknown> {
    return this.http.post(
      `/api/v1/operations/order/${serviceOrderId}/sustitucion/devolver`,
      {},
    );
  }
}
