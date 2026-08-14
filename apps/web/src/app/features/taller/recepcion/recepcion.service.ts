import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

const URL = "/api/v1/reception";

export interface CitaAgenda {
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
  mechanicName: string | null;
  recibida: boolean;
  serviceOrderId: string | null;
  serviceOrderFolio: string | null;
}

export interface PhotoSpec {
  code: string;
  name: string;
  hint: string | null;
  required: boolean;
  tomada: boolean;
}

export interface PhotoMark {
  id: string;
  type: string;
  note: string | null;
  x: number;
  y: number;
}

export interface ReceptionPhoto {
  id: string;
  specCode: string | null;
  angle: string;
  mediaType: string;
  storageKey: string;
  /** Liga firmada y temporal. Nula si el almacenamiento no está configurado. */
  url: string | null;
  marks: PhotoMark[];
}

export interface Reception {
  serviceOrder: {
    id: string;
    folio: string;
    status: string;
    reportedFault: string;
    kmIn: number;
    receptionQuotationId: string | null;
  };
  checklist: {
    kmIn: number;
    fuelLevel: number;
    hasSpareTire: boolean;
    hasTools: boolean;
    hasDocuments: boolean;
    hasMats: boolean;
    observations: string | null;
    damageDescription: string | null;
  } | null;
  specs: PhotoSpec[];
  pendientes: string[];
  fotos: ReceptionPhoto[];
}

export interface DatosUnidad {
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  plate?: string;
  vin?: string;
  mileage?: number;
  color?: string;
}

/** Tipos de unidad que puede recibir el taller. */
export const TIPOS_UNIDAD = [
  { value: "MOTORCYCLE", label: "Motocicleta" },
  { value: "CAR", label: "Automóvil" },
  { value: "SUV", label: "SUV" },
  { value: "MINIVAN", label: "Minivan" },
  { value: "TRUCK", label: "Camioneta" },
  { value: "VAN", label: "Van" },
];

/** Un kit ya resuelto contra el almacén: trae precio real y disponibilidad. */
export interface KitResuelto {
  id: string;
  code: string;
  kitType: string;
  name: string;
  laborMinutes: number;
  laborPrice: number;
  partsTotal: number;
  total: number;
  stock: "VERDE" | "AMBAR" | "ROJO";
  faltantes: string[];
  items: {
    sku: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    stockQuantity: number | null;
    suficiente: boolean;
  }[];
}

export interface ServicioPredefinido {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price?: number;
}

/** Tipos de marca que el asesor puede poner sobre una foto. */
export const MARK_TYPES = [
  { value: "SCRATCH", label: "Rayón" },
  { value: "DENT", label: "Golpe" },
  { value: "BROKEN", label: "Roto" },
  { value: "MISSING", label: "Faltante" },
  { value: "WEAR", label: "Desgaste" },
  { value: "OTHER", label: "Otro" },
];

@Injectable({ providedIn: "root" })
export class RecepcionService {
  private http = inject(HttpClient);

  agenda(branchId: string, date: string): Observable<CitaAgenda[]> {
    const params = new HttpParams().set("branchId", branchId).set("date", date);
    return this.http.get<CitaAgenda[]>(`${URL}/agenda`, { params });
  }

  /**
   * Crea (o recupera) la orden de servicio de una cita.
   * Las citas del bot llegan sin unidad: en ese caso se envían sus datos,
   * que es cuando el asesor tiene la unidad enfrente.
   */
  recibirCita(
    appointmentId: string,
    datos?: { vehiculo?: DatosUnidad },
  ): Observable<{ id: string; folio: string }> {
    return this.http.post<{ id: string; folio: string }>(
      `${URL}/from-appointment/${appointmentId}`,
      datos ?? {},
    );
  }

  get(serviceOrderId: string): Observable<Reception> {
    return this.http.get<Reception>(`${URL}/${serviceOrderId}`);
  }

  saveChecklist(
    serviceOrderId: string,
    dto: Record<string, unknown>,
  ): Observable<unknown> {
    return this.http.post(`${URL}/${serviceOrderId}/checklist`, dto);
  }

  uploadMedia(
    serviceOrderId: string,
    specCode: string,
    file: File,
  ): Observable<ReceptionPhoto> {
    const form = new FormData();
    form.append("file", file);
    return this.http.post<ReceptionPhoto>(
      `${URL}/${serviceOrderId}/media/${specCode}`,
      form,
    );
  }

  addMark(
    photoId: string,
    dto: { type: string; note?: string; x: number; y: number },
  ): Observable<unknown> {
    return this.http.post(`${URL}/photos/${photoId}/marks`, dto);
  }

  removeMark(id: string): Observable<unknown> {
    return this.http.delete(`${URL}/marks/${id}`);
  }

  /**
   * Kits de servicio disponibles. El backend los resuelve contra el almacén,
   * así que el asesor ve el precio real y si hay existencias antes de
   * prometer una fecha de entrega.
   */
  kits(branchId?: string, vehicleType?: string): Observable<KitResuelto[]> {
    let params = new HttpParams();
    if (branchId) params = params.set("branchId", branchId);
    if (vehicleType) params = params.set("vehicleType", vehicleType);
    return this.http.get<KitResuelto[]>("/api/v1/service-kits", { params });
  }

  serviciosPredefinidos(branchId?: string): Observable<ServicioPredefinido[]> {
    let params = new HttpParams();
    if (branchId) params = params.set("branchId", branchId);
    return this.http.get<ServicioPredefinido[]>(`${URL}/service-types`, {
      params,
    });
  }

  cotizar(
    serviceOrderId: string,
    lines: { description: string; quantity: number; unitPrice: number }[],
    conditions?: string,
  ): Observable<{ folio: string; total: number; clientToken: string }> {
    return this.http.post<{ folio: string; total: number; clientToken: string }>(
      `${URL}/${serviceOrderId}/quote`,
      { lines, conditions },
    );
  }
}
