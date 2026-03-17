import { Routes } from "@angular/router";

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
    data: { breadcrumb: "Catálogo" },
    loadChildren: () =>
      import("../../../app/features/catalogo/catalogo.routes").then(
        (r) => r.catalogRoutes,
      ),
  },
  {
    path: "parts-inventory",
    data: { breadcrumb: "Inventario refacciones" },
    loadChildren: () =>
      import("../../../app/features/inventario-refacciones/inventario-refacciones.routes").then(
        (r) => r.partsInventoryRoutes,
      ),
  },
  {
    path: "units-inventory",
    data: { breadcrumb: "Inventario unidades" },
    loadChildren: () =>
      import("../../../app/features/inventario-unidades/inventario-unidades.routes").then(
        (r) => r.unitsInventoryRoutes,
      ),
  },
  {
    path: "purchases",
    data: { breadcrumb: "Compras" },
    loadChildren: () =>
      import("../../../app/features/compras/compras.routes").then(
        (r) => r.purchasesRoutes,
      ),
  },
  {
    path: "warehouse",
    data: { breadcrumb: "Almacén" },
    loadChildren: () =>
      import("../../../app/features/almacen/almacen.routes").then(
        (r) => r.warehouseRoutes,
      ),
  },
  {
    path: "cash-register",
    data: { breadcrumb: "Caja y ventas" },
    loadChildren: () =>
      import("../../../app/features/caja-ventas/caja-ventas.routes").then(
        (r) => r.cashRegisterRoutes,
      ),
  },
  {
    path: "sales",
    data: { breadcrumb: "Ventas de unidades" },
    loadChildren: () =>
      import("../../../app/features/ventas-unidades/ventas-unidades.routes").then(
        (r) => r.unitSalesRoutes
      ),
  },
  {
    path: "quotes",
    data: { breadcrumb: "Cotizaciones" },
    loadChildren: () =>
      import("../../../app/features/cotizaciones/cotizaciones.routes").then(
        (r) => r.quotesRoutes,
      ),
  },
  {
    path: "workshop",
    data: { breadcrumb: "Taller" },
    loadChildren: () =>
      import("../../../app/features/taller/taller.routes").then(
        (r) => r.workshopRoutes,
      ),
  },
  {
    path: "warranties",
    data: { breadcrumb: "Garantías" },
    loadChildren: () =>
      import("../../../app/features/garantias/garantias.routes").then(
        (r) => r.warrantiesRoutes,
      ),
  },
  {
    path: "cfdi",
    data: { breadcrumb: "CFDI" },
    loadChildren: () =>
      import("../../../app/features/cfdi/cfdi.routes").then(
        (r) => r.cfdiRoutes,
      ),
  },
  {
    path: "reports",
    data: { breadcrumb: "Reportes" },
    loadChildren: () =>
      import("../../../app/features/reportes/reportes.routes").then(
        (r) => r.reportsRoutes,
      ),
  },
  {
    path: "billing",
    data: { breadcrumb: "Facturación" },
    loadChildren: () =>
      import("../../../app/features/billing/billing.routes").then(
        (r) => r.billingRoutes,
      ),
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
