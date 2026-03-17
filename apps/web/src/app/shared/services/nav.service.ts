import { HostListener, Injectable } from "@angular/core";

import { BehaviorSubject } from "rxjs";

// Menu
export interface Menu {
  path?: string;
  title?: string;
  icon?: string;
  type?: string;
  badgeType?: string;
  badgeValue?: string;
  active?: boolean;
  bookmark?: boolean;
  children?: Menu[];
}

@Injectable({
  providedIn: "root",
})
export class NavService {
  public screenWidth: number;
  public collapseSidebar: boolean = false;
  public fullScreen = false;

  constructor() {
    this.onResize();
    if (this.screenWidth < 991) {
      this.collapseSidebar = true;
    }
  }

  @HostListener("window:resize", ["$event"])
  onResize(_event?: number) {
    this.screenWidth = window.innerWidth;
  }

  MENUITEMS: Menu[] = [
    {
      path: "/dashboard/default",
      title: "Inicio",
      icon: "home",
      type: "link",
      active: true,
    },
    {
      title: "CRM",
      icon: "users",
      type: "sub",
      active: false,
      children: [
        { path: "/clientes", title: "Clientes", type: "link" },
        { path: "/contact/contacts", title: "Contactos", type: "link" },
      ],
    },
    {
      title: "Catálogo",
      icon: "package",
      type: "sub",
      active: false,
      children: [
        { path: "/catalogo", title: "Modelos globales", type: "link" },
      ],
    },
    {
      title: "Inventario refacciones",
      icon: "box",
      type: "sub",
      active: false,
      children: [
        { path: "/inventario-refacciones", title: "Partes", type: "link" },
        { path: "/inventario-refacciones", title: "Ubicaciones almacén", type: "link" },
        { path: "/inventario-refacciones", title: "Movimientos", type: "link" },
      ],
    },
    {
      title: "Inventario unidades",
      icon: "car",
      type: "sub",
      active: false,
      children: [
        { path: "/inventario-unidades", title: "Catálogo unidades", type: "link" },
        { path: "/inventario-unidades", title: "Ubicaciones", type: "link" },
      ],
    },
    {
      title: "Compras",
      icon: "shopping-cart",
      type: "sub",
      active: false,
      children: [
        { path: "/compras", title: "Proveedores", type: "link" },
        { path: "/compras", title: "Órdenes de compra", type: "link" },
      ],
    },
    {
      title: "Almacén",
      icon: "truck",
      type: "sub",
      active: false,
      children: [
        { path: "/almacen", title: "Transferencias", type: "link" },
        { path: "/almacen", title: "Apartados", type: "link" },
      ],
    },
    {
      title: "Caja y ventas",
      icon: "dollar-sign",
      type: "sub",
      active: false,
      children: [
        { path: "/caja", title: "Caja", type: "link" },
        { path: "/ventas", title: "Ventas (POS)", type: "link" },
        { path: "/ventas", title: "Listas de precio", type: "link" },
      ],
    },
    {
      title: "Unidades",
      icon: "shopping-bag",
      type: "sub",
      active: false,
      children: [
        { path: "/ventas", title: "Ventas de unidades", type: "link" },
        { path: "/ventas", title: "Reservas", type: "link" },
      ],
    },
    {
      path: "/cotizaciones",
      title: "Cotizaciones",
      icon: "file-text",
      type: "link",
    },
    {
      title: "Taller",
      icon: "settings",
      type: "sub",
      active: false,
      children: [
        { path: "/taller", title: "Órdenes de servicio", type: "link" },
        { path: "/taller", title: "Agenda", type: "link" },
        { path: "/taller", title: "Citas", type: "link" },
      ],
    },
    {
      path: "/garantias",
      title: "Garantías",
      icon: "shield",
      type: "link",
    },
    {
      path: "/cfdi",
      title: "CFDI",
      icon: "file",
      type: "link",
    },
    {
      title: "Reportes",
      icon: "bar-chart",
      type: "sub",
      active: false,
      children: [
        { path: "/reportes", title: "Comisiones", type: "link" },
        { path: "/reportes", title: "Reportes", type: "link" },
      ],
    },
    {
      path: "/billing",
      title: "Facturación",
      icon: "credit-card",
      type: "link",
    },
    {
      path: "/configuracion",
      title: "Configuración",
      icon: "settings",
      type: "link",
    },
  ];

  items = new BehaviorSubject<Menu[]>(this.MENUITEMS);
}
