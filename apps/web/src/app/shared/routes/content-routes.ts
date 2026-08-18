import { Routes } from "@angular/router";
import { moduleGuard } from "../guard/module.guard";

export const content: Routes = [
  {
    path: "dashboard",
    data: { breadcrumb: "Inicio" },
    loadChildren: () =>
      import("../../../app/components/dashboard/dashboard.routes").then(
        (r) => r.dashboard,
      ),
  },
  {
    path: "clients",
    data: { breadcrumb: "Clientes" },
    loadChildren: () =>
      import("../../../app/features/clientes/clientes.routes").then(
        (r) => r.clientsRoutes,
      ),
  },
  {
    path: "catalog",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Catálogo" , module: "catalog" },
    loadChildren: () =>
      import("../../../app/features/catalogo/catalogo.routes").then(
        (r) => r.catalogRoutes,
      ),
  },
  {
    path: "parts-inventory",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Inventario refacciones" , module: "parts-inventory" },
    loadChildren: () =>
      import("../../../app/features/inventario-refacciones/inventario-refacciones.routes").then(
        (r) => r.partsInventoryRoutes,
      ),
  },
  {
    path: "importar-catalogos",
    data: { breadcrumb: "Importar catálogos", title: "Importar catálogos" },
    loadComponent: () =>
      import("../../../app/features/importaciones/importaciones").then(
        (m) => m.Importaciones,
      ),
  },
  {
    path: "units-inventory",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Inventario unidades" , module: "units-inventory" },
    loadChildren: () =>
      import("../../../app/features/inventario-unidades/inventario-unidades.routes").then(
        (r) => r.unitsInventoryRoutes,
      ),
  },
  {
    path: "purchases",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Compras" , module: "purchases" },
    loadChildren: () =>
      import("../../../app/features/compras/compras.routes").then(
        (r) => r.purchasesRoutes,
      ),
  },
  {
    path: "warehouse",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Almacén" , module: "warehouse" },
    loadChildren: () =>
      import("../../../app/features/almacen/almacen.routes").then(
        (r) => r.warehouseRoutes,
      ),
  },
  {
    path: "cash-register",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Caja y ventas" , module: "cash-register" },
    loadChildren: () =>
      import("../../../app/features/caja-ventas/caja-ventas.routes").then(
        (r) => r.cashRegisterRoutes,
      ),
  },
  {
    path: "sales",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Ventas de unidades" , module: "sales" },
    loadChildren: () =>
      import("../../../app/features/ventas-unidades/ventas-unidades.routes").then(
        (r) => r.unitSalesRoutes
      ),
  },
  {
    path: "quotes",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Presupuestos" , module: "quotes" },
    loadChildren: () =>
      import("../../../app/features/cotizaciones/cotizaciones.routes").then(
        (r) => r.quotesRoutes,
      ),
  },
  {
    // Módulo independiente: hay talleres que contratan solo la recepción, y el
    // asesor que la opera no necesita el resto del taller.
    path: "reception",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Recepción", module: "reception" },
    loadComponent: () =>
      import(
        "../../../app/features/taller/recepcion/recepcion-page"
      ).then((m) => m.RecepcionPage),
    title: "Recepción de unidades",
  },
  {
    path: "workshop",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Taller" , module: "workshop" },
    loadChildren: () =>
      import("../../../app/features/taller/taller.routes").then(
        (r) => r.workshopRoutes,
      ),
  },
  {
    path: "warranties",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Garantías" , module: "warranties" },
    loadChildren: () =>
      import("../../../app/features/garantias/garantias.routes").then(
        (r) => r.warrantiesRoutes,
      ),
  },
  {
    path: "cfdi",
    canActivate: [moduleGuard],
    data: { breadcrumb: "CFDI" , module: "cfdi" },
    loadChildren: () =>
      import("../../../app/features/cfdi/cfdi.routes").then(
        (r) => r.cfdiRoutes,
      ),
  },
  {
    path: "reports",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Reportes" , module: "reports" },
    loadChildren: () =>
      import("../../../app/features/reportes/reportes.routes").then(
        (r) => r.reportsRoutes,
      ),
  },
  // ── Dashboards por módulo y administración de licencia ──
  {
    path: "m/:key",
    canActivate: [moduleGuard],
    loadComponent: () =>
      import("../../../app/features/modulos/module-dashboard").then(
        (m) => m.ModuleDashboard,
      ),
    data: { title: "Dashboard de módulo", breadcrumb: "Módulo" },
  },
  {
    path: "modulos",
    loadComponent: () =>
      import("../../../app/features/modulos/admin-modulos").then(
        (m) => m.AdminModulos,
      ),
    data: { title: "Módulos", breadcrumb: "Módulos" },
  },
  {
    path: "sin-acceso",
    loadComponent: () =>
      import("../../../app/features/modulos/sin-acceso").then(
        (m) => m.SinAcceso,
      ),
    data: { title: "Sin acceso", breadcrumb: "Sin acceso" },
  },
  {
    path: "finance",
    canActivate: [moduleGuard],
    loadComponent: () =>
      import("../../../app/features/finanzas/finanzas-page").then(
        (m) => m.FinanzasPage,
      ),
    data: { title: "Finanzas", breadcrumb: "Finanzas", module: "finance" },
  },
  {
    path: "leads",
    canActivate: [moduleGuard],
    loadComponent: () =>
      import("../../../app/features/leads/leads-page").then(
        (m) => m.LeadsPage,
      ),
    data: { title: "Leads", breadcrumb: "Leads", module: "leads" },
  },
  {
    path: "used-units",
    canActivate: [moduleGuard],
    loadComponent: () =>
      import("../../../app/features/seminuevos/seminuevos-page").then(
        (m) => m.SeminuevosPage,
      ),
    data: {
      title: "Seminuevos",
      breadcrumb: "Seminuevos",
      module: "used-units",
    },
  },
  {
    path: "pld",
    canActivate: [moduleGuard],
    loadComponent: () =>
      import("../../../app/features/pld/pld-page").then((m) => m.PldPage),
    data: { title: "Cumplimiento PLD", breadcrumb: "PLD" , module: "pld" },
  },
  {
    path: "billing",
    canActivate: [moduleGuard],
    data: { breadcrumb: "Facturación" , module: "billing" },
    loadChildren: () =>
      import("../../../app/features/billing/billing.routes").then(
        (r) => r.billingRoutes,
      ),
  },
  {
    path: "perfil",
    loadComponent: () =>
      import("../../../app/pages/perfil/perfil").then((m) => m.Perfil),
    data: { title: "Mi perfil", breadcrumb: "Perfil" },
  },
  {
    path: "settings",
    data: { breadcrumb: "Configuración" },
    loadChildren: () =>
      import("../../../app/features/configuracion/configuracion.routes").then(
        (r) => r.settingsRoutes,
      ),
  },
  // Contactos: selector de cliente para ver sus contactos
  {
    path: "contacts",
    data: { breadcrumb: "Contactos" },
    loadChildren: () =>
      import("../../../app/features/clientes/contactos/contactos.routes").then(
        (r) => r.contactsRoutes,
      ),
  },
];
