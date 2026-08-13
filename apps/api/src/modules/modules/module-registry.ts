import { TenantPlanEnum } from '../tenants/entities/tenant.entity';

/**
 * Registro único de módulos de NexDMS.
 *
 * Es la fuente de verdad para: el menú del web, los guards de licencia
 * (API y rutas), los dashboards por módulo y la pantalla de administración.
 * Si un módulo no está aquí, no existe para el sistema.
 *
 * La clave (`key`) coincide con el primer segmento de la ruta del web
 * (p. ej. `workshop` → /workshop/...), que es como se resuelve el permiso.
 */

export type ModuleKey =
  | 'dashboard'
  | 'clients'
  | 'leads'
  | 'catalog'
  | 'parts-inventory'
  | 'units-inventory'
  | 'purchases'
  | 'used-units'
  | 'warehouse'
  | 'cash-register'
  | 'sales'
  | 'quotes'
  | 'workshop'
  | 'warranties'
  | 'finance'
  | 'cfdi'
  | 'billing'
  | 'pld'
  | 'reports'
  | 'settings';

export interface ModuleDef {
  key: ModuleKey;
  /** Nombre visible en menú, dashboards y administración. */
  name: string;
  /** Descripción corta para la pantalla de administración de módulos. */
  description: string;
  icon: string;
  /** Ruta principal del módulo en el web. */
  route: string;
  /** Plan mínimo que lo incluye. */
  minPlan: TenantPlanEnum;
  /** Núcleo: no se puede desactivar (la app deja de funcionar sin él). */
  core?: boolean;
  /** Tiene dashboard propio en /m/:key. */
  hasDashboard?: boolean;
}

/** Orden jerárquico de planes: cada uno incluye lo del anterior. */
const PLAN_RANK: Record<TenantPlanEnum, number> = {
  [TenantPlanEnum.BASIC]: 1,
  [TenantPlanEnum.PRO]: 2,
  [TenantPlanEnum.ENTERPRISE]: 3,
};

export const MODULE_REGISTRY: ModuleDef[] = [
  {
    key: 'dashboard',
    name: 'Inicio',
    description: 'Panel general con los indicadores de los módulos activos.',
    icon: 'home',
    route: '/dashboard/default',
    minPlan: TenantPlanEnum.BASIC,
    core: true,
  },
  {
    key: 'clients',
    name: 'Clientes',
    description: 'Cartera de clientes, contactos y vehículos.',
    icon: 'users',
    route: '/clients',
    minPlan: TenantPlanEnum.BASIC,
    core: true,
    hasDashboard: true,
  },
  {
    key: 'workshop',
    name: 'Taller',
    description: 'Órdenes de servicio, citas y planificador de técnicos.',
    icon: 'tool',
    route: '/workshop/service-orders',
    minPlan: TenantPlanEnum.BASIC,
    hasDashboard: true,
  },
  {
    key: 'cash-register',
    name: 'Caja y ventas',
    description: 'Punto de venta de mostrador, caja y listas de precio.',
    icon: 'dollar-sign',
    route: '/cash-register',
    minPlan: TenantPlanEnum.BASIC,
    hasDashboard: true,
  },
  {
    key: 'parts-inventory',
    name: 'Inventario de refacciones',
    description: 'Partes, categorías, ubicaciones y mínimos de stock.',
    icon: 'box',
    route: '/parts-inventory',
    minPlan: TenantPlanEnum.BASIC,
    hasDashboard: true,
  },
  {
    key: 'quotes',
    name: 'Cotizaciones',
    description: 'Cotizaciones de refacciones, servicios y unidades.',
    icon: 'file-text',
    route: '/quotes',
    minPlan: TenantPlanEnum.BASIC,
    hasDashboard: true,
  },
  {
    key: 'catalog',
    name: 'Catálogo',
    description: 'Marcas, modelos, variantes y tipos de vehículo.',
    icon: 'package',
    route: '/catalog',
    minPlan: TenantPlanEnum.PRO,
  },
  {
    key: 'units-inventory',
    name: 'Inventario de unidades',
    description: 'Unidades en piso, ubicaciones y estados.',
    icon: 'car',
    route: '/units-inventory',
    minPlan: TenantPlanEnum.PRO,
    hasDashboard: true,
  },
  {
    key: 'sales',
    name: 'Ventas de unidades',
    description: 'Ventas de unidades, reservas y planes de pago.',
    icon: 'shopping-bag',
    route: '/sales',
    minPlan: TenantPlanEnum.PRO,
    hasDashboard: true,
  },
  {
    key: 'purchases',
    name: 'Compras',
    description: 'Órdenes de compra, proveedores y recepciones.',
    icon: 'shopping-cart',
    route: '/purchases/purchase-orders',
    minPlan: TenantPlanEnum.PRO,
    hasDashboard: true,
  },
  {
    key: 'warehouse',
    name: 'Almacén',
    description: 'Traspasos entre sucursales y apartados.',
    icon: 'truck',
    route: '/warehouse/transferencias',
    minPlan: TenantPlanEnum.PRO,
    hasDashboard: true,
  },
  {
    key: 'leads',
    name: 'Leads',
    description: 'Prospectos y oportunidades comerciales.',
    icon: 'user-plus',
    route: '/leads',
    minPlan: TenantPlanEnum.PRO,
    hasDashboard: true,
  },
  {
    key: 'used-units',
    name: 'Seminuevos',
    description: 'Tomas y avalúos de compra a particular.',
    icon: 'repeat',
    route: '/used-units',
    minPlan: TenantPlanEnum.PRO,
    hasDashboard: true,
  },
  {
    key: 'warranties',
    name: 'Garantías',
    description: 'Garantías de unidades y refacciones.',
    icon: 'shield',
    route: '/warranties',
    minPlan: TenantPlanEnum.PRO,
  },
  {
    key: 'cfdi',
    name: 'CFDI',
    description: 'Timbrado y bitácora de comprobantes fiscales.',
    icon: 'file',
    route: '/cfdi',
    minPlan: TenantPlanEnum.PRO,
  },
  {
    key: 'finance',
    name: 'Finanzas',
    description: 'Cuentas por cobrar y por pagar con antigüedad de saldos.',
    icon: 'credit-card',
    route: '/finance',
    minPlan: TenantPlanEnum.ENTERPRISE,
    hasDashboard: true,
  },
  {
    key: 'pld',
    name: 'Cumplimiento PLD',
    description: 'Operaciones vulnerables, expedientes y avisos SAT/UIF.',
    icon: 'shield',
    route: '/pld',
    minPlan: TenantPlanEnum.ENTERPRISE,
    hasDashboard: true,
  },
  {
    key: 'reports',
    name: 'Reportes',
    description: 'Reportes generales y de comisiones.',
    icon: 'bar-chart',
    route: '/reports',
    minPlan: TenantPlanEnum.ENTERPRISE,
  },
  {
    key: 'billing',
    name: 'Facturación',
    description: 'Facturación del negocio y plan NexDMS.',
    icon: 'credit-card',
    route: '/billing',
    minPlan: TenantPlanEnum.ENTERPRISE,
  },
  {
    key: 'settings',
    name: 'Configuración',
    description: 'Sucursales, usuarios y ajustes generales.',
    icon: 'settings',
    route: '/settings',
    minPlan: TenantPlanEnum.BASIC,
    core: true,
  },
];

export const MODULE_KEYS = MODULE_REGISTRY.map((m) => m.key);

export function getModule(key: string): ModuleDef | undefined {
  return MODULE_REGISTRY.find((m) => m.key === key);
}

/** Módulos incluidos en un plan (el plan es el tope de lo contratable). */
export function modulesForPlan(plan: TenantPlanEnum): ModuleKey[] {
  const rank = PLAN_RANK[plan] ?? 1;
  return MODULE_REGISTRY.filter((m) => PLAN_RANK[m.minPlan] <= rank).map(
    (m) => m.key,
  );
}

/**
 * Módulos efectivos de un tenant.
 *
 * Regla: el plan define el universo contratado; `enabledModules` permite
 * apagar módulos dentro de ese universo (o encender excepciones negociadas).
 * Los módulos `core` siempre quedan activos. `enabledModules = null`
 * significa "todo lo del plan".
 */
export function resolveModules(
  plan: TenantPlanEnum,
  enabledModules: string[] | null,
): ModuleKey[] {
  const fromPlan = new Set(modulesForPlan(plan));
  const core = MODULE_REGISTRY.filter((m) => m.core).map((m) => m.key);

  if (!enabledModules || enabledModules.length === 0) {
    return MODULE_REGISTRY.filter((m) => fromPlan.has(m.key)).map((m) => m.key);
  }

  const selected = new Set<string>([...enabledModules, ...core]);
  // Se respeta el orden del registro para que el menú salga estable
  return MODULE_REGISTRY.filter((m) => selected.has(m.key)).map((m) => m.key);
}

export function hasModule(
  plan: TenantPlanEnum,
  enabledModules: string[] | null,
  key: string,
): boolean {
  return resolveModules(plan, enabledModules).includes(key as ModuleKey);
}
