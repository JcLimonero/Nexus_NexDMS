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
  /** Paquete comercial contratado; null en quien nunca se le asignó uno. */
  saasPlanId?: string | null;
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

// ─── Administración del negocio (planes, precios, cobros) ─────

export interface PlanPrecio {
  id: string;
  /** Código comercial del paquete; en los de sistema coincide con el nivel. */
  key: string;
  /** Nivel técnico que otorga: el tope de lo que puede incluir. */
  tier: Plan;
  name: string;
  description: string | null;
  monthlyPrice: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  /** `null` = entrega todo lo que su nivel permite. */
  includedModules: string[] | null;
  /** Los tres de origen: se tarifan, pero ni se borran ni cambian de nivel. */
  isSystem: boolean;
}

export interface PrecioModulo {
  key: string;
  name: string;
  minPlan: Plan;
  core: boolean;
  monthlyPrice: number;
  currency: string;
}

export type EstadoPago = "PENDIENTE" | "PAGADO" | "VENCIDO" | "CANCELADO";

export interface Pago {
  id: string;
  period: string;
  amount: number;
  currency: string;
  status: EstadoPago;
  dueDate: string | null;
  paidAt: string | null;
  method: string | null;
  reference: string | null;
  concept: string | null;
  /** Lo calcula el backend: pendiente cuya fecha límite ya pasó. */
  vencido?: boolean;
}

/** Datos comerciales del cliente; el resto del tenant no cambia aquí. */
export interface FichaComercial {
  /** Paquete comercial contratado; al cambiarlo se mueven nivel y módulos. */
  saasPlanId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  rfc: string | null;
  billingEmail: string | null;
  address: string | null;
  notes: string | null;
  subscriptionStart: string | null;
  billingDay: number | null;
  extraModules: string[] | null;
}

export interface Ficha {
  tenant: Tenant & FichaComercial;
  /** Liga de acceso del cliente (DMS); se conserva por compatibilidad. */
  accessUrl: string;
  /** Liga por portal (`<base>/<slug>`), para copiar y compartir. */
  accessUrls: { dms: string; recepcion: string; tecnico: string };
  cobro: {
    plan: { key: Plan; name: string; precio: number };
    extras: { key: string; name: string; precio: number }[];
    total: number;
    moneda: string;
  };
  modulos: { activos: number; incluidosEnPlan: number; extras: string[] };
  pagos: Pago[];
  resumen: {
    totalPagado: number;
    mesesPagados: number;
    vencidos: number;
    adeudo: number;
    ultimoPago: string | null;
    antiguedadMeses: number | null;
  };
}

export interface ClienteMoroso {
  tenantId: string;
  nombre: string;
  slug: string;
  estado: "SOLO_LECTURA" | "BLOQUEADO";
  diasMora: number;
  diasParaBloqueo: number;
  adeudo: number;
  suspendidoManual: boolean;
}

export interface Panorama {
  clientes: number;
  activos: number;
  suspendidos: number;
  ingresoMensual: number;
  adeudoTotal: number;
  clientesConAdeudo: number;
  enSoloLectura: number;
  bloqueadosPorPago: number;
  morosos: ClienteMoroso[];
}

@Injectable({ providedIn: "root" })
export class SaasService {
  private http = inject(HttpClient);

  panorama(): Observable<Panorama> {
    return this.http.get<Panorama>("/api/v1/saas/overview");
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
}

export interface PaletaMarca {
  id: string;
  nombre: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  tinta: string;
}

export interface Branding {
  paletaId: string;
  paleta: PaletaMarca;
  logoKey: string | null;
  logoUrl: string | null;
  iconKey: string | null;
  iconUrl: string | null;
}
