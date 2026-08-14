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
    // La suscripción se mudó al perfil, donde solo la ve quien administra la
    // cuenta. La ruta se conserva redirigiendo para no romper un enlace
    // guardado ni un marcador.
    path: "plan",
    redirectTo: "/perfil",
    pathMatch: "full",
  },
];
