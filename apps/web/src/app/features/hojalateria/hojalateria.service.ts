import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

export type BodyworkStatus =
  | "RECEIVED"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";
export type BodyworkPayment = "PARTICULAR" | "INSURANCE";
export type BodyworkOperation = "REPAIR" | "REPLACE" | "PAINT";
export type BodyworkItemStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface OrdenLista {
  id: string;
  folio: number;
  status: BodyworkStatus;
  clientName: string;
  clientPhone: string | null;
  vehiclePlate: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  paymentType: BodyworkPayment;
  insuranceCompany: string | null;
  total: number;
  createdAt: string;
}

export interface BodyworkItem {
  id: string;
  bodyworkPartId: string | null;
  partName: string;
  operation: BodyworkOperation;
  quantity: number;
  laborPrice: number;
  materialPrice: number;
  partPrice: number;
  subtotal: number;
  status: BodyworkItemStatus;
  note: string | null;
}

export interface BodyworkFoto {
  id: string;
  itemId: string | null;
  caption: string | null;
  url: string | null;
}

export interface OrdenDetalle extends OrdenLista {
  branchId: string | null;
  clientId: string | null;
  vehicleYear: number | null;
  vehicleColor: string | null;
  vehicleVin: string | null;
  policyNumber: string | null;
  claimNumber: string | null;
  deductible: number | null;
  adjuster: string | null;
  claimDate: string | null;
  kmIn: number | null;
  fuelLevel: string | null;
  damageDescription: string | null;
  observations: string | null;
  assignedTo: string | null;
  laborTotal: number;
  materialTotal: number;
  partsTotal: number;
  deliveredAt: string | null;
  items: BodyworkItem[];
  photos: BodyworkFoto[];
}

export interface Pieza {
  id: string;
  tenantId: string | null;
  code: string;
  name: string;
  zone: string;
  defaultPrice: number;
  isActive: boolean;
  sortOrder: number;
}

export type OrdenPayload = Partial<Omit<OrdenDetalle, "id" | "items" | "photos">>;
export type ItemPayload = Partial<Omit<BodyworkItem, "id" | "subtotal">>;
export type PiezaPayload = Partial<Omit<Pieza, "id" | "tenantId">>;

@Injectable({ providedIn: "root" })
export class HojalateriaService {
  private http = inject(HttpClient);
  private base = "/api/v1/bodywork";

  // Órdenes
  listar(status?: BodyworkStatus): Observable<OrdenLista[]> {
    let params = new HttpParams();
    if (status) params = params.set("status", status);
    return this.http.get<OrdenLista[]>(this.base, { params });
  }
  crear(dto: OrdenPayload): Observable<OrdenDetalle> {
    return this.http.post<OrdenDetalle>(this.base, dto);
  }
  detalle(id: string): Observable<OrdenDetalle> {
    return this.http.get<OrdenDetalle>(`${this.base}/${id}`);
  }
  actualizar(id: string, dto: OrdenPayload): Observable<OrdenDetalle> {
    return this.http.patch<OrdenDetalle>(`${this.base}/${id}`, dto);
  }
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Partidas
  agregarItem(id: string, dto: ItemPayload): Observable<BodyworkItem> {
    return this.http.post<BodyworkItem>(`${this.base}/${id}/items`, dto);
  }
  actualizarItem(itemId: string, dto: ItemPayload): Observable<BodyworkItem> {
    return this.http.patch<BodyworkItem>(`${this.base}/items/${itemId}`, dto);
  }
  eliminarItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/items/${itemId}`);
  }

  // Fotos
  subirFoto(
    id: string,
    file: File,
    itemId?: string,
    caption?: string,
  ): Observable<{ id: string; url: string | null }> {
    const fd = new FormData();
    fd.append("file", file);
    if (itemId) fd.append("itemId", itemId);
    if (caption) fd.append("caption", caption);
    return this.http.post<{ id: string; url: string | null }>(
      `${this.base}/${id}/photos`,
      fd,
    );
  }
  eliminarFoto(photoId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/photos/${photoId}`);
  }

  // Catálogo
  catalogo(): Observable<Pieza[]> {
    return this.http.get<Pieza[]>(`${this.base}/catalog/parts`);
  }
  crearPieza(dto: PiezaPayload): Observable<Pieza> {
    return this.http.post<Pieza>(`${this.base}/catalog/parts`, dto);
  }
  actualizarPieza(id: string, dto: PiezaPayload): Observable<Pieza> {
    return this.http.patch<Pieza>(`${this.base}/catalog/parts/${id}`, dto);
  }
  eliminarPieza(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/catalog/parts/${id}`);
  }
}
