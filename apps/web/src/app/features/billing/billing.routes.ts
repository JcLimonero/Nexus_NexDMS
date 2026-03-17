import { Routes } from "@angular/router";

export const billingRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./facturacion-landing/facturacion-landing").then(
        (m) => m.FacturacionLanding
      ),
    data: { title: "Facturación", breadcrumb: "Facturación" },
  },
  {
    path: "facturas",
    children: [
      {
        path: "",
        loadComponent: () =>
          import("../cfdi/list/cfdi-list").then((m) => m.CfdiList),
        data: { title: "Facturas (CFDI)", breadcrumb: "Facturas" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("../cfdi/detail/cfdi-detail").then((m) => m.CfdiDetail),
        data: { title: "Detalle factura", breadcrumb: "Detalle" },
      },
    ],
  },
  {
    path: "plan",
    loadComponent: () =>
      import("./billing-plan/billing-plan").then((m) => m.BillingPlan),
    data: { title: "Plan NexDMS", breadcrumb: "Plan" },
  },
];
