import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  Branding,
  DashboardOps,
  Ficha,
  FichaComercial,
  NuevaSucursal,
  Pago,
  PaletaMarca,
  Panorama,
  PlanPrecio,
  PrecioModulo,
  NuevoUsuarioTenant,
  RazonSocial,
  ResumenCobro,
  Sucursal,
  Tenant,
  UsuarioTenant,
} from "./models";

/** Administración del negocio SaaS: panorama, planes, precios, cobros, marca y
 *  usuarios base de cada empresa. */
@Injectable({ providedIn: "root" })
export class SaasService {
  private http = inject(HttpClient);

  panorama(): Observable<Panorama> {
    return this.http.get<Panorama>("/api/v1/saas/overview");
  }

  /** Agregados operativos de toda la plataforma (dashboard del admin). */
  dashboardOps(): Observable<DashboardOps> {
    return this.http.get<DashboardOps>("/api/v1/saas/dashboard-ops");
  }

  /** Último pago y próximo cobro de cada cliente, para la lista. */
  resumenCobros(): Observable<ResumenCobro[]> {
    return this.http.get<ResumenCobro[]>("/api/v1/saas/payments-summary");
  }

  planes(): Observable<PlanPrecio[]> {
    return this.http.get<PlanPrecio[]>("/api/v1/saas/plans");
  }

  crearPlan(dto: Partial<PlanPrecio>): Observable<PlanPrecio> {
    return this.http.post<PlanPrecio>("/api/v1/saas/plans", dto);
  }

  guardarPlan(id: string, dto: Partial<PlanPrecio>): Observable<PlanPrecio> {
    return this.http.patch<PlanPrecio>(`/api/v1/saas/plans/${id}`, dto);
  }

  eliminarPlan(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/saas/plans/${id}`);
  }

  preciosDeModulos(): Observable<PrecioModulo[]> {
    return this.http.get<PrecioModulo[]>("/api/v1/saas/module-prices");
  }

  guardarPrecioModulo(key: string, monthlyPrice: number): Observable<unknown> {
    return this.http.put(`/api/v1/saas/module-prices/${key}`, { monthlyPrice });
  }

  ficha(tenantId: string): Observable<Ficha> {
    return this.http.get<Ficha>(`/api/v1/saas/tenants/${tenantId}`);
  }

  guardarFicha(
    tenantId: string,
    dto: Partial<FichaComercial>,
  ): Observable<Tenant> {
    return this.http.patch<Tenant>(`/api/v1/saas/tenants/${tenantId}`, dto);
  }

  registrarPago(tenantId: string, dto: Partial<Pago>): Observable<Pago> {
    return this.http.post<Pago>(
      `/api/v1/saas/tenants/${tenantId}/payments`,
      dto,
    );
  }

  eliminarPago(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/saas/payments/${id}`);
  }

  // ─── Marca del cliente ───────────────────────────
  paletas(): Observable<PaletaMarca[]> {
    return this.http.get<PaletaMarca[]>("/api/v1/saas/branding/paletas");
  }

  branding(tenantId: string): Observable<Branding> {
    return this.http.get<Branding>(`/api/v1/saas/tenants/${tenantId}/branding`);
  }

  guardarBranding(
    tenantId: string,
    dto: { paletaId?: string; logoKey?: string | null; iconKey?: string | null },
  ): Observable<Branding> {
    return this.http.put<Branding>(
      `/api/v1/saas/tenants/${tenantId}/branding`,
      dto,
    );
  }

  subirLogo(tenantId: string, file: File): Observable<Branding> {
    return this.subirImagen(tenantId, file, "logo");
  }

  subirIcono(tenantId: string, file: File): Observable<Branding> {
    return this.subirImagen(tenantId, file, "icon");
  }

  private subirImagen(
    tenantId: string,
    file: File,
    tipo: "logo" | "icon",
  ): Observable<Branding> {
    const form = new FormData();
    form.append("file", file);
    return this.http.post<Branding>(
      `/api/v1/saas/tenants/${tenantId}/branding/${tipo}`,
      form,
    );
  }

  // ─── Usuarios base del cliente ───────────────────────
  usuarios(tenantId: string): Observable<UsuarioTenant[]> {
    return this.http.get<UsuarioTenant[]>(
      `/api/v1/saas/tenants/${tenantId}/users`,
    );
  }

  crearUsuario(
    tenantId: string,
    dto: NuevoUsuarioTenant,
  ): Observable<UsuarioTenant> {
    return this.http.post<UsuarioTenant>(
      `/api/v1/saas/tenants/${tenantId}/users`,
      dto,
    );
  }

  cambiarContrasena(
    tenantId: string,
    userId: string,
    password: string,
  ): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(
      `/api/v1/saas/tenants/${tenantId}/users/${userId}/password`,
      { password },
    );
  }

  alternarUsuario(
    tenantId: string,
    userId: string,
  ): Observable<{ id: string; isActive: boolean }> {
    return this.http.patch<{ id: string; isActive: boolean }>(
      `/api/v1/saas/tenants/${tenantId}/users/${userId}/active`,
      {},
    );
  }

  // ─── Sucursales del cliente ───────────────────────
  razonesSociales(tenantId: string): Observable<RazonSocial[]> {
    return this.http.get<RazonSocial[]>(
      `/api/v1/saas/tenants/${tenantId}/legal-entities`,
    );
  }

  sucursales(tenantId: string): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(
      `/api/v1/saas/tenants/${tenantId}/branches`,
    );
  }

  crearSucursal(
    tenantId: string,
    dto: NuevaSucursal,
  ): Observable<Sucursal> {
    return this.http.post<Sucursal>(
      `/api/v1/saas/tenants/${tenantId}/branches`,
      dto,
    );
  }

  actualizarSucursal(
    tenantId: string,
    branchId: string,
    dto: Partial<NuevaSucursal>,
  ): Observable<Sucursal> {
    return this.http.patch<Sucursal>(
      `/api/v1/saas/tenants/${tenantId}/branches/${branchId}`,
      dto,
    );
  }

  alternarSucursal(
    tenantId: string,
    branchId: string,
  ): Observable<Sucursal> {
    return this.http.patch<Sucursal>(
      `/api/v1/saas/tenants/${tenantId}/branches/${branchId}/active`,
      {},
    );
  }
}
