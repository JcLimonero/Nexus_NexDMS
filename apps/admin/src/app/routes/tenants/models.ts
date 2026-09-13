// Modelos compartidos del dominio de administración (empresas, planes, cobros).

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
  /** Prefijo de 3 letras para los códigos de documentos (APGC00000001). */
  codePrefix?: string | null;
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
  /** Opcional: si no se manda, el backend lo sugiere de las iniciales. */
  codePrefix?: string;
  plan: Plan;
  isActive?: boolean;
}

export interface CambioEstatus {
  id: string;
  previousActive: boolean;
  newActive: boolean;
  reason: string;
  changedBy: string | null;
  createdAt: string;
}

export interface ResumenCobro {
  tenantId: string;
  ultimoPago: { period: string; status: EstadoPago; vencido: boolean } | null;
  proximoCobro: string | null;
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
  /** Identidad de la empresa: se edita en la propia ficha. */
  name: string;
  slug: string;
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

export interface DashboardOps {
  ops: {
    clientes: number;
    vehiculos: number;
    ordenesMes: number;
    ordenesActivas: number;
    citasMes: number;
    ventasMes: number;
    usuarios: number;
  };
  planes: { plan: string; total: number }[];
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

/** Cuenta de acceso de una empresa (para el tab de Usuarios). */
export interface UsuarioTenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  scope: string;
  isActive: boolean;
  bloqueado: boolean;
  lastLoginAt: string | null;
}

export interface NuevoUsuarioTenant {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roles: string[];
  scope: string;
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

/** Razón social (persona moral) de la empresa; de ella cuelgan las sucursales. */
export interface RazonSocial {
  id: string;
  name: string;
  type: string;
  rfc: string | null;
  isActive: boolean;
}

/** Sucursal (punto de atención) de la empresa. */
export interface Sucursal {
  id: string;
  name: string;
  slug: string;
  legalEntityId: string;
  legalEntityName: string | null;
  address: string;
  city: string;
  state: string;
  counterPhone: string;
  partsPhone: string | null;
  appointmentsPhone: string | null;
  aftersalesPhone: string | null;
  email: string;
  isPrimary: boolean;
  isActive: boolean;
}

/** Alta/edición de una sucursal desde la administración. */
export interface NuevaSucursal {
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
  isPrimary?: boolean;
  isActive?: boolean;
}
