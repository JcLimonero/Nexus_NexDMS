import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

const URL = "/api/v1/sale-documents";

export type AmbitoDocumento = "CLIENT" | "SALE";
export type EstadoDocumento = "PENDING" | "APPROVED" | "REJECTED";

export interface TipoDocumento {
  id: string;
  key: string;
  name: string;
  scope: AmbitoDocumento;
  hasExpiration: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface ReglaDocumento {
  id: string;
  documentTypeId: string;
  clientType: string | null;
  financingType: string | null;
  vehicleCategory: string | null;
  isRequired: boolean;
  documentType?: TipoDocumento;
}

export interface RequisitoResuelto {
  documentTypeId: string;
  key: string;
  name: string;
  scope: AmbitoDocumento;
  hasExpiration: boolean;
  required: boolean;
  cumplido: {
    id: string;
    origen: "CLIENTE" | "VENTA";
    status: EstadoDocumento;
    vencido: boolean;
    expirationDate: string | null;
    createdAt: string;
  } | null;
}

export interface Expediente {
  venta: { id: string; folio: string; status: string };
  ejes: {
    clientType: string | null;
    financingType: string | null;
    vehicleCategory: string | null;
  };
  requisitos: RequisitoResuelto[];
  completo: boolean;
  faltan: string[];
}

/** Documentos de una venta: catálogo, matriz y expediente. */
@Injectable({ providedIn: "root" })
export class DocumentosVentaService {
  private http = inject(HttpClient);

  // ── Catálogo y matriz (configuración) ──
  tipos(): Observable<TipoDocumento[]> {
    return this.http.get<TipoDocumento[]>(`${URL}/types`);
  }

  guardarTipo(dto: Partial<TipoDocumento>): Observable<TipoDocumento> {
    return this.http.put<TipoDocumento>(`${URL}/types`, dto);
  }

  eliminarTipo(id: string): Observable<unknown> {
    return this.http.delete(`${URL}/types/${id}`);
  }

  reglas(): Observable<ReglaDocumento[]> {
    return this.http.get<ReglaDocumento[]>(`${URL}/rules`);
  }

  categoriasVehiculo(): Observable<{ code: string; label: string }[]> {
    return this.http.get<{ code: string; label: string }[]>(
      `${URL}/vehicle-categories`,
    );
  }

  guardarRegla(dto: Partial<ReglaDocumento>): Observable<ReglaDocumento> {
    return this.http.put<ReglaDocumento>(`${URL}/rules`, dto);
  }

  eliminarRegla(id: string): Observable<unknown> {
    return this.http.delete(`${URL}/rules/${id}`);
  }

  // ── Expediente de una venta ──
  expediente(unitSaleId: string): Observable<Expediente> {
    return this.http.get<Expediente>(`${URL}/sale/${unitSaleId}`);
  }

  subir(
    unitSaleId: string,
    documentTypeId: string,
    file: File,
    expirationDate?: string,
  ): Observable<unknown> {
    const form = new FormData();
    form.append("file", file);
    let url = `${URL}/sale/${unitSaleId}/upload?documentTypeId=${documentTypeId}`;
    if (expirationDate) url += `&expirationDate=${expirationDate}`;
    return this.http.post(url, form);
  }

  ligaDescarga(documentId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(
      `${URL}/document/${documentId}/download-url`,
    );
  }

  revisar(
    documentId: string,
    status: EstadoDocumento,
    rejectionReason?: string,
  ): Observable<unknown> {
    return this.http.post(`${URL}/document/${documentId}/review`, {
      status,
      rejectionReason,
    });
  }

  eliminarDocumento(documentId: string): Observable<unknown> {
    return this.http.delete(`${URL}/document/${documentId}`);
  }

  // ── Documentos del cliente ──
  expedienteCliente(clientId: string): Observable<DocClienteResuelto[]> {
    return this.http.get<DocClienteResuelto[]>(`${URL}/client/${clientId}`);
  }

  subirCliente(
    clientId: string,
    documentTypeId: string,
    file: File,
  ): Observable<unknown> {
    const form = new FormData();
    form.append("file", file);
    return this.http.post(
      `${URL}/client/${clientId}/upload?documentTypeId=${documentTypeId}`,
      form,
    );
  }

  ligaDescargaCliente(documentId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(
      `${URL}/client-document/${documentId}/download-url`,
    );
  }
}

export interface DocClienteResuelto {
  documentTypeId: string;
  key: string;
  name: string;
  hasExpiration: boolean;
  cumplido: { id: string; status: EstadoDocumento; createdAt: string } | null;
}

/** Etiquetas de los tres ejes, para pantalla. */
export const ETIQUETA_CATEGORIA: Record<string, string> = {
  MOTO: "Moto",
  AUTO: "Auto",
};
export const ETIQUETA_CLIENTE: Record<string, string> = {
  INDIVIDUAL: "Persona física",
  BUSINESS: "Persona moral",
};
export const ETIQUETA_VENTA: Record<string, string> = {
  CASH: "Contado",
  AGENCY_CREDIT: "Crédito de agencia",
  BANK_CREDIT: "Crédito bancario",
};
export const ETIQUETA_VEHICULO: Record<string, string> = {
  MOTORCYCLE: "Motocicleta",
  CAR: "Automóvil",
  SUV: "SUV",
  MINIVAN: "Minivan",
  TRUCK: "Pickup",
  VAN: "Van",
  CARGO_VAN: "Van de carga",
  BOX_TRUCK: "Camión",
};
