import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

const URL = "/api/v1/legal-entities";

/** Giro de la razón social; determina qué catálogos le aplican. */
export type TipoRazonSocial = "MOTO" | "AUTO" | "BOTH";

export const TIPOS_RAZON_SOCIAL: { value: TipoRazonSocial; label: string }[] = [
  { value: "MOTO", label: "Motocicletas" },
  { value: "AUTO", label: "Automóviles" },
  { value: "BOTH", label: "Ambos" },
];

export interface RazonSocial {
  id: string;
  tenantId: string;
  name: string;
  type: TipoRazonSocial;
  logoKey: string | null;
  /** Datos fiscales: viven aquí porque quien está dado de alta ante el SAT
      es la persona moral, no la sucursal. */
  rfc: string | null;
  taxRegime: string | null;
  taxPostalCode: string | null;
  facturaapiOrgId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface NuevaRazonSocial {
  name: string;
  type: TipoRazonSocial;
  rfc?: string;
  taxRegime?: string;
  taxPostalCode?: string;
  facturaapiOrgId?: string;
  isActive?: boolean;
}

/**
 * Razones sociales del grupo.
 *
 * Es el nivel intermedio de la organización: el grupo factura a través de
 * ellas y cada sucursal cuelga de una. El alcance de los usuarios se apoya en
 * esta relación, así que dejarlas sin administrar dejaba la jerarquía a medias.
 */
@Injectable({ providedIn: "root" })
export class RazonesSocialesService {
  private http = inject(HttpClient);

  /** El endpoint pagina: devuelve `{ data, meta }`, no un arreglo suelto. */
  listar(soloActivas = false): Observable<RazonSocial[]> {
    let params = new HttpParams().set("limit", "100");
    if (soloActivas) params = params.set("isActive", "true");
    return this.http
      .get<{ data: RazonSocial[] }>(URL, { params })
      .pipe(map((r) => r.data ?? []));
  }

  obtener(id: string): Observable<RazonSocial> {
    return this.http.get<RazonSocial>(`${URL}/${id}`);
  }

  crear(dto: NuevaRazonSocial): Observable<RazonSocial> {
    return this.http.post<RazonSocial>(URL, dto);
  }

  actualizar(id: string, dto: Partial<NuevaRazonSocial>): Observable<RazonSocial> {
    return this.http.patch<RazonSocial>(`${URL}/${id}`, dto);
  }

  eliminar(id: string): Observable<unknown> {
    return this.http.delete(`${URL}/${id}`);
  }
}
