import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

const URL = "/api/v1/branches";

/**
 * Datos propios de la sucursal.
 *
 * Ya no lleva RFC, régimen ni domicilio fiscal: eso es de la razón social. Lo
 * que queda aquí es la operación —dónde está, con qué teléfonos atiende, su
 * horario y sus reglas comerciales— más la serie de folios, que identifica el
 * punto de emisión.
 */
export interface Sucursal {
  id?: string;
  legalEntityId: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  counterPhone: string;
  partsPhone?: string;
  appointmentsPhone?: string;
  aftersalesPhone?: string;
  email: string;
  schedule: Record<string, string>;
  timezone?: string;
  taxRate?: number;
  maxDiscountPct?: number;
  quotationValidityDays?: number;
  cfdiSerie?: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

@Injectable({ providedIn: "root" })
export class SucursalFormService {
  private http = inject(HttpClient);

  obtener(id: string): Observable<Sucursal> {
    return this.http.get<Sucursal>(`${URL}/${id}`);
  }

  crear(dto: Sucursal): Observable<Sucursal> {
    return this.http.post<Sucursal>(URL, dto);
  }

  actualizar(id: string, dto: Partial<Sucursal>): Observable<Sucursal> {
    return this.http.patch<Sucursal>(`${URL}/${id}`, dto);
  }
}
