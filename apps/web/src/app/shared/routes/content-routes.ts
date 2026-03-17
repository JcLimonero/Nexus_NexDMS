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
      import("../../../app/features/inventario-refacciones/inventario-refacciones.routes").then(
        (r) => r.inventarioRefaccionesRoutes,
      ),
  },
  {
    path: "inventario-unidades",
    data: { breadcrumb: "Inventario unidades" },
    loadChildren: () =>
      import("../../../app/features/inventario-unidades/inventario-unidades.routes").then(
        (r) => r.inventarioUnidadesRoutes,
      ),
  },
  {
    path: "compras",
    data: { breadcrumb: "Compras" },
    loadChildren: () =>
      import("../../../app/features/compras/compras.routes").then(
        (r) => r.comprasRoutes,
      ),
  },
  {
    path: "almacen",
    data: { breadcrumb: "Almacén" },
    loadChildren: () =>
      import("../../../app/features/almacen/almacen.routes").then(
        (r) => r.almacenRoutes,
      ),
  },
  {
    path: "caja",
    data: { breadcrumb: "Caja y ventas" },
    loadChildren: () =>
      import("../../../app/features/caja-ventas/caja-ventas.routes").then(
        (r) => r.cajaVentasRoutes,
      ),
  },
  {
    path: "ventas",
    data: { breadcrumb: "Ventas de unidades" },
    loadChildren: () =>
      import("../../../app/features/ventas-unidades/ventas-unidades.routes").then(
        (r) => r.ventasUnidadesRoutes
      ),
  },
  {
    path: "cotizaciones",
    data: { breadcrumb: "Cotizaciones" },
    loadChildren: () =>
      import("../../../app/features/cotizaciones/cotizaciones.routes").then(
        (r) => r.cotizacionesRoutes,
      ),
  },
  {
    path: "taller",
    data: { breadcrumb: "Taller" },
    loadChildren: () =>
      import("../../../app/features/taller/taller.routes").then(
        (r) => r.tallerRoutes,
      ),
  },
  {
    path: "garantias",
    data: { breadcrumb: "Garantías" },
    loadChildren: () =>
      import("../../../app/features/garantias/garantias.routes").then(
        (r) => r.garantiasRoutes,
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
    path: "reportes",
    data: { breadcrumb: "Reportes" },
    loadChildren: () =>
      import("../../../app/features/reportes/reportes.routes").then(
        (r) => r.reportesRoutes,
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
      import("../../../app/features/configuracion/configuracion.routes").then(
        (r) => r.configuracionRoutes,
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
