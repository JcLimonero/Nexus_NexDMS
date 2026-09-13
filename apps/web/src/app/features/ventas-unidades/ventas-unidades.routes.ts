import { Routes } from "@angular/router";

export const unitSalesRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./list/ventas-unidades-list").then((m) => m.VentasUnidadesList),
    data: { title: "Ventas de unidades", breadcrumb: "Ventas de unidades" },
  },
  {
    path: "nueva",
    loadComponent: () =>
      import("./form/venta-unidad-form").then((m) => m.VentaUnidadForm),
    data: { title: "Nueva venta", breadcrumb: "Nueva" },
  },
  {
    path: "plantilla-contrato",
    loadComponent: () =>
      import("./plantilla-contrato/plantilla-contrato").then(
        (m) => m.PlantillaContrato,
      ),
    data: {
      title: "Plantilla de contrato",
      breadcrumb: "Plantilla de contrato",
    },
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./detail/venta-unidad-detail").then((m) => m.VentaUnidadDetail),
    data: { title: "Detalle venta", breadcrumb: "Detalle" },
  },
];
