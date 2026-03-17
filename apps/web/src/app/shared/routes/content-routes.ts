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
    path: "clientes",
    data: { breadcrumb: "Clientes" },
    loadChildren: () =>
      import("../../../app/features/clientes/clientes.routes").then(
        (r) => r.clientesRoutes,
      ),
  },
  {
    path: "catalogo",
    data: { breadcrumb: "Catálogo" },
    loadChildren: () =>
      import("../../../app/features/catalogo/catalogo.routes").then(
        (r) => r.catalogoRoutes,
      ),
  },
  {
    path: "inventario-refacciones",
    data: { breadcrumb: "Inventario refacciones" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.inventarioRefacciones,
      ),
  },
  {
    path: "inventario-unidades",
    data: { breadcrumb: "Inventario unidades" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.inventarioUnidades,
      ),
  },
  {
    path: "compras",
    data: { breadcrumb: "Compras" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.compras,
      ),
  },
  {
    path: "almacen",
    data: { breadcrumb: "Almacén" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.almacen,
      ),
  },
  {
    path: "caja",
    data: { breadcrumb: "Caja" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.caja,
      ),
  },
  {
    path: "ventas",
    data: { breadcrumb: "Ventas" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.ventas,
      ),
  },
  {
    path: "cotizaciones",
    data: { breadcrumb: "Cotizaciones" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.cotizaciones,
      ),
  },
  {
    path: "taller",
    data: { breadcrumb: "Taller" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.taller,
      ),
  },
  {
    path: "garantias",
    data: { breadcrumb: "Garantías" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.garantias,
      ),
  },
  {
    path: "cfdi",
    data: { breadcrumb: "CFDI" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.cfdi,
      ),
  },
  {
    path: "reportes",
    data: { breadcrumb: "Reportes" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.reportes,
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
    path: "configuracion",
    data: { breadcrumb: "Configuración" },
    loadChildren: () =>
      import("../../../app/components/placeholder/placeholder.routes").then(
        (r) => r.configuracion,
      ),
  },
  // Contactos: selector de cliente para ver sus contactos
  {
    path: "contactos",
    data: { breadcrumb: "Contactos" },
    loadChildren: () =>
      import("../../../app/features/clientes/contactos/contactos.routes").then(
        (r) => r.contactosRoutes,
      ),
  },
];
