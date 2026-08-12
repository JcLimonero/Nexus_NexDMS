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
        { path: "/clients", title: "Clientes", type: "link" },
        { path: "/leads", title: "Leads", type: "link" },
      ],
    },
    {
      title: "Catálogo",
      icon: "package",
      type: "sub",
      active: false,
      children: [
        { path: "/catalog", title: "Variantes", type: "link" },
        { path: "/catalog/marcas", title: "Marcas", type: "link" },
        { path: "/catalog/vehicle-types", title: "Tipos de vehículo", type: "link" },
        { path: "/catalog/combustion-types", title: "Tipos de combustión", type: "link" },
      ],
    },
    {
      title: "Inventario refacciones",
      icon: "box",
      type: "sub",
      active: false,
      children: [
        { path: "/parts-inventory", title: "Partes", type: "link" },
        { path: "/parts-inventory/categories", title: "Categorías", type: "link" },
        { path: "/parts-inventory/locations", title: "Ubicaciones almacén", type: "link" },
      ],
    },
    {
      title: "Inventario unidades",
      icon: "car",
      type: "sub",
      active: false,
      children: [
        { path: "/units-inventory", title: "Unidades", type: "link" },
        { path: "/units-inventory/locations", title: "Ubicaciones", type: "link" },
      ],
    },
    {
      title: "Compras",
      icon: "shopping-cart",
      type: "sub",
      active: false,
      children: [
        { path: "/purchases/proveedores", title: "Proveedores", type: "link" },
        { path: "/purchases/purchase-orders", title: "Órdenes de compra", type: "link" },
        { path: "/used-units", title: "Seminuevos", type: "link" },
      ],
    },
    {
      title: "Almacén",
      icon: "truck",
      type: "sub",
      active: false,
      children: [
        { path: "/warehouse/transferencias", title: "Transferencias", type: "link" },
        { path: "/warehouse/apartados", title: "Apartados", type: "link" },
      ],
    },
    {
      title: "Caja y ventas",
      icon: "dollar-sign",
      type: "sub",
      active: false,
      children: [
        { path: "/cash-register", title: "Caja", type: "link" },
        { path: "/cash-register/ventas", title: "Ventas (POS)", type: "link" },
        { path: "/cash-register/listas-precio", title: "Listas de precio", type: "link" },
      ],
    },
    {
      title: "Unidades",
      icon: "shopping-bag",
      type: "sub",
      active: false,
      children: [
        { path: "/sales", title: "Ventas de unidades", type: "link" },
        { path: "/sales", title: "Reservas", type: "link" },
      ],
    },
    {
      path: "/finance",
      title: "Finanzas",
      icon: "credit-card",
      type: "link",
    },
    {
      path: "/pld",
      title: "Cumplimiento PLD",
      icon: "shield",
      type: "link",
    },
    {
      path: "/quotes",
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
        { path: "/workshop/service-orders", title: "Órdenes de servicio", type: "link" },
        { path: "/workshop/agenda", title: "Agenda", type: "link" },
        { path: "/workshop/citas", title: "Citas", type: "link" },
      ],
    },
    {
      path: "/warranties",
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
        { path: "/reports", title: "Inicio", type: "link" },
        { path: "/reports/comisiones", title: "Comisiones", type: "link" },
        { path: "/reports/general", title: "Reportes generales", type: "link" },
      ],
    },
    {
      title: "Facturación",
      icon: "credit-card",
      type: "sub",
      active: false,
      children: [
        { path: "/billing", title: "Inicio", type: "link" },
        { path: "/billing/facturas", title: "Facturas (CFDI)", type: "link" },
        { path: "/billing/plan", title: "Plan NexDMS", type: "link" },
      ],
    },
    {
      title: "Configuración",
      icon: "settings",
      type: "sub",
      active: false,
      children: [
        { path: "/settings", title: "Inicio", type: "link" },
        { path: "/settings/sucursales", title: "Sucursales", type: "link" },
        { path: "/settings/general", title: "General", type: "link" },
      ],
    },
  ];

  items = new BehaviorSubject<Menu[]>(this.MENUITEMS);

  /**
   * Filtra el menú según los módulos habilitados del tenant (SaaS).
   * La clave de módulo es el primer segmento del path (p.ej. "workshop").
   * null/vacío = todos los módulos.
   */
  applyEnabledModules(mods: string[] | null): void {
    if (!mods || mods.length === 0) {
      this.items.next(this.MENUITEMS);
      return;
    }
    const allowed = new Set([...mods, "dashboard"]);
    const keyOf = (m: Menu): string => {
      const p = m.path ?? m.children?.[0]?.path ?? "";
      return p.split("/")[1] ?? "";
    };
    this.items.next(this.MENUITEMS.filter((m) => allowed.has(keyOf(m))));
  }
}
