import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, map } from "rxjs";

export interface Convenio {
  id: string;
  clientId: string;
  clienteNombre: string;
  agreementNumber: string;
  name: string;
  partsPriceListId: string | null;
  partsDiscountPct: number | null;
  laborDiscountPct: number | null;
  unitSaleDiscountPct: number | null;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  notes: string | null;
  unidades: number;
}

export interface UnidadConvenio {
  unitId: string;
  vehicleId: string;
  plate: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
}

/** Lo que devuelve GET /fleets/:id (unidades como arreglo, no conteo). */
export interface ConvenioDetalleApi extends Omit<Convenio, "unidades"> {
  vigente: boolean;
  unidades: UnidadConvenio[];
}

export interface VehiculoDisponible {
  id: string;
  plate: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
}

export interface PriceListOpcion {
  id: string;
  name: string;
}

export interface ClienteOpcion {
  id: string;
  nombre: string;
}

export type ConvenioPayload = Partial<
  Omit<Convenio, "id" | "clienteNombre" | "unidades">
> & { clientId?: string };

@Injectable({ providedIn: "root" })
export class FlotillasService {
  private http = inject(HttpClient);
  private base = "/api/v1/fleets";

  listar(): Observable<Convenio[]> {
    return this.http.get<Convenio[]>(this.base);
  }
  crear(dto: ConvenioPayload): Observable<Convenio> {
    return this.http.post<Convenio>(this.base, dto);
  }
  detalle(id: string): Observable<ConvenioDetalleApi> {
    return this.http.get<ConvenioDetalleApi>(`${this.base}/${id}`);
  }
  actualizar(id: string, dto: ConvenioPayload): Observable<Convenio> {
    return this.http.patch<Convenio>(`${this.base}/${id}`, dto);
  }
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  unidadesDisponibles(id: string): Observable<VehiculoDisponible[]> {
    return this.http.get<VehiculoDisponible[]>(`${this.base}/${id}/available-units`);
  }
  agregarUnidad(id: string, vehicleId: string): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/units`, { vehicleId });
  }
  quitarUnidad(unitId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/units/${unitId}`);
  }

  // Auxiliares
  priceLists(): Observable<PriceListOpcion[]> {
    return this.http.get<PriceListOpcion[]>("/api/v1/price-lists");
  }
  buscarClientes(q: string): Observable<ClienteOpcion[]> {
    const params = new HttpParams().set("q", q).set("limit", "8");
    return this.http
      .get<
        {
          id: string;
          companyName?: string | null;
          firstName?: string | null;
          lastName?: string | null;
        }[]
      >("/api/v1/clients/search", { params })
      .pipe(
        map((cs) =>
          cs.map((c) => ({
            id: c.id,
            nombre:
              c.companyName ||
              [c.firstName, c.lastName].filter(Boolean).join(" ") ||
              "(sin nombre)",
          })),
        ),
      );
  }
}
