import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export type Plan = "BASIC" | "PRO" | "ENTERPRISE";

export const PLANES: { value: Plan; label: string; orden: number }[] = [
  { value: "BASIC", label: "Básico", orden: 1 },
  { value: "PRO", label: "Pro", orden: 2 },
  { value: "ENTERPRISE", label: "Empresarial", orden: 3 },
];

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  /** null = el tenant usa todo lo que su plan permite. */
  enabledModules: string[] | null;
  isActive: boolean;
  createdAt: string;
}

export interface NuevoTenant {
  name: string;
  slug: string;
  plan: Plan;
  isActive?: boolean;
}

export interface Modulo {
  key: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  minPlan: Plan;
  /** Los de núcleo no se pueden apagar: sin ellos el DMS no opera. */
  core: boolean;
  hasDashboard: boolean;
}

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

  /** Suspende o reactiva; el backend alterna según el estado actual. */
  suspender(id: string): Observable<Tenant> {
    return this.http.patch<Tenant>(`/api/v1/tenants/${id}/suspend`, {});
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
