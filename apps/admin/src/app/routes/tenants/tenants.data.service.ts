import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { CambioEstatus, Modulo, NuevoTenant, Tenant } from "./models";

/** Operaciones sobre empresas (tenants): alta, edición, módulos, suspensión. */
@Injectable({ providedIn: "root" })
export class TenantsService {
  private http = inject(HttpClient);

  listar(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>("/api/v1/tenants");
  }

  crear(dto: NuevoTenant): Observable<Tenant> {
    return this.http.post<Tenant>("/api/v1/tenants", dto);
  }

  actualizar(id: string, dto: Partial<NuevoTenant>): Observable<Tenant> {
    return this.http.patch<Tenant>(`/api/v1/tenants/${id}`, dto);
  }

  /** Suspende o reactiva; el backend alterna según el estado actual. Exige motivo. */
  suspender(id: string, reason: string): Observable<Tenant> {
    return this.http.patch<Tenant>(`/api/v1/tenants/${id}/suspend`, { reason });
  }

  /** Bitácora de suspensiones/reactivaciones del cliente. */
  historialEstatus(id: string): Observable<CambioEstatus[]> {
    return this.http.get<CambioEstatus[]>(
      `/api/v1/tenants/${id}/status-history`,
    );
  }

  /**
   * "Entrar como" el cliente: pide al backend una sesión de DMS y devuelve la
   * liga lista para abrir con la sesión puesta.
   */
  entrarComo(id: string): Observable<{ url: string; dmsUrl: string }> {
    return this.http.post<{ url: string; dmsUrl: string }>(
      `/api/v1/auth/impersonate/${id}`,
      {},
    );
  }

  /** Catálogo completo de módulos con su plan mínimo. */
  catalogo(): Observable<{ modules: Modulo[] }> {
    return this.http.get<{ modules: Modulo[] }>("/api/v1/modules/catalog");
  }

  modulosDe(id: string): Observable<{ enabledModules: string[] | null }> {
    return this.http.get<{ enabledModules: string[] | null }>(
      `/api/v1/tenants/${id}/modules`,
    );
  }

  guardarModulos(
    id: string,
    enabledModules: string[] | null,
  ): Observable<{ enabledModules: string[] | null }> {
    return this.http.patch<{ enabledModules: string[] | null }>(
      `/api/v1/tenants/${id}/modules`,
      { enabledModules },
    );
  }
}
