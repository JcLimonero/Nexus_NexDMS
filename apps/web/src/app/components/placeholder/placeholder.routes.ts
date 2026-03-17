import { Routes } from "@angular/router";

function placeholderRoute(title: string): Routes {
  return [
    {
      path: "",
      loadComponent: () =>
        import("./placeholder").then((m) => m.Placeholder),
      data: { title, breadcrumb: title },
    },
  ];
}

export const clientes = placeholderRoute("Clientes");
export const catalogo = placeholderRoute("Catálogo");
export const inventarioRefacciones = placeholderRoute("Inventario refacciones");
export const inventarioUnidades = placeholderRoute("Inventario unidades");
export const compras = placeholderRoute("Compras");
export const almacen = placeholderRoute("Almacén");
export const caja = placeholderRoute("Caja");
export const ventas = placeholderRoute("Ventas");
export const cotizaciones = placeholderRoute("Cotizaciones");
export const taller = placeholderRoute("Taller");
export const garantias = placeholderRoute("Garantías");
export const cfdi = placeholderRoute("CFDI");
export const reportes = placeholderRoute("Reportes");
export const configuracion = placeholderRoute("Configuración");
