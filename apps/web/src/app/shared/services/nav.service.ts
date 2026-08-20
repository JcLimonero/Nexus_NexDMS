import { HostListener, Injectable } from "@angular/core";

import { BehaviorSubject } from "rxjs";

import { inDemoMode } from "../utils/demo-mode";

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
  queryParams?: Record<string, string>;
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
    // ── Taller (servicio) ──────────────────────────────────
    {
      title: "Taller",
      icon: "tool",
      type: "sub",
      active: false,
      children: [
        { path: "/reception", title: "Recepción de unidades", type: "link" },
        { path: "/workshop/citas", title: "Citas", type: "link" },
        // Demo screen: hidden by the same switch that governs the rest of
        // the made-up data.
        ...(inDemoMode()
          ? [
              {
                path: "/workshop/conversaciones",
                title: "Conversaciones",
                type: "link",
              },
            ]
          : []),
        { path: "/workshop/agenda", title: "Agenda", type: "link" },
        { path: "/quotes/servicio", title: "Presupuestos de servicio", type: "link" },
        { path: "/workshop/service-orders", title: "Órdenes de servicio", type: "link" },
        { path: "/workshop/tablero-taller", title: "Monitor de taller", type: "link" },
        { path: "/workshop/tablero-citas", title: "Monitor de citas", type: "link" },
        { path: "/deliveries", title: "Entregas de taller", type: "link", queryParams: { tipo: "SERVICE" } },
        { path: "/service-surveys", title: "Encuestas de servicio", type: "link" },
        // Garantía por cada trabajo hecho en el taller (independiente de la
        // garantía de venta de la unidad). Hoy comparte pantalla con la de
        // unidades; se separará cuando el backend distinga el tipo.
        { path: "/warranties", title: "Garantías de taller", type: "link" },
      ],
    },
    // ── Ventas de unidades ─────────────────────────────────
    {
      title: "Ventas de unidades",
      icon: "truck",
      type: "sub",
      active: false,
      children: [
        { path: "/units-inventory", title: "Inventario de unidades", type: "link" },
        { path: "/sales-appointments", title: "Citas de ventas", type: "link" },
        { path: "/quotes", title: "Presupuestos de venta", type: "link" },
        { path: "/sales", title: "Ventas de unidades", type: "link" },
        { path: "/sales", title: "Reservas", type: "link" },
        { path: "/deliveries", title: "Entregas de unidad", type: "link", queryParams: { tipo: "UNIT_SALE" } },
        { path: "/sale-surveys", title: "Encuestas de venta", type: "link" },
        { path: "/used-units", title: "Seminuevos", type: "link" },
        // Garantía de la unidad vendida (distinta de la garantía por trabajo
        // de taller). Comparte pantalla con la de taller por ahora.
        { path: "/warranties", title: "Garantías de unidades", type: "link" },
      ],
    },
    // ── Refacciones (inventario, compras y almacén) ────────
    {
      title: "Refacciones",
      icon: "box",
      type: "sub",
      active: false,
      children: [
        { path: "/parts-inventory", title: "Inventario de refacciones", type: "link" },
        {
          title: "Compras",
          type: "sub",
          active: false,
          children: [
            { path: "/purchases/proveedores", title: "Proveedores", type: "link" },
            { path: "/purchases/purchase-orders", title: "Órdenes de compra", type: "link" },
            { path: "/purchases/requisiciones", title: "Por pedir", type: "link" },
          ],
        },
        {
          title: "Almacén",
          type: "sub",
          active: false,
          children: [
            { path: "/warehouse/transferencias", title: "Transferencias", type: "link" },
            { path: "/warehouse/apartados", title: "Apartados", type: "link" },
            { path: "/warehouse/costeo", title: "Costeo", type: "link" },
            { path: "/warehouse/conteos", title: "Conteos físicos", type: "link" },
            { path: "/warehouse/escaneo", title: "Inventario rápido", type: "link" },
            { path: "/warehouse/devoluciones", title: "Devoluciones y garantías", type: "link" },
          ],
        },
      ],
    },
    // ── Transversales ──────────────────────────────────────
    {
      title: "Caja y ventas",
      icon: "dollar-sign",
      type: "sub",
      active: false,
      children: [
        { path: "/cash-register", title: "Caja", type: "link" },
        { path: "/cash-register/ventas", title: "Punto de venta", type: "link" },
      ],
    },
    {
      path: "/finance",
      title: "Finanzas",
      icon: "credit-card",
      type: "link",
    },
    {
      // Solo los CFDI que el concesionario emite a sus clientes. Lo que el
      // grupo paga por usar NexDMS es otra cosa y vive en el perfil: no le
      // incumbe a quien factura a un cliente, y juntarlos hacía pensar que
      // "Facturación" era la cuenta del sistema.
      title: "Facturación",
      icon: "credit-card",
      type: "sub",
      active: false,
      children: [
        { path: "/billing", title: "Inicio", type: "link" },
        { path: "/billing/facturas", title: "Facturas (CFDI)", type: "link" },
      ],
    },
    {
      path: "/pld",
      title: "Cumplimiento PLD",
      icon: "shield",
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
      title: "Configuración",
      icon: "settings",
      type: "sub",
      active: false,
      children: [
        { path: "/settings", title: "Inicio", type: "link" },
        { path: "/settings/sucursales", title: "Sucursales", type: "link" },
        { path: "/settings/encuestas", title: "Encuestas", type: "link" },
        { path: "/settings/credito", title: "Crédito y adeudos", type: "link" },
        { path: "/settings/general", title: "General", type: "link" },
        { path: "/modulos", title: "Módulos y licencia", type: "link" },
        {
          title: "Catálogos",
          type: "sub",
          active: false,
          children: [
            { path: "/catalog/marcas", title: "Marcas", type: "link" },
            { path: "/catalog", title: "Variantes", type: "link" },
            { path: "/catalog/vehicle-types", title: "Tipos de vehículo", type: "link" },
            { path: "/catalog/combustion-types", title: "Tipos de combustión", type: "link" },
            { path: "/parts-inventory/categories", title: "Categorías de refacciones", type: "link" },
            { path: "/parts-inventory/locations", title: "Ubicaciones de almacén", type: "link" },
            { path: "/units-inventory/locations", title: "Ubicaciones de unidades", type: "link" },
            { path: "/cash-register/listas-precio", title: "Listas de precio", type: "link" },
            { path: "/cfdi", title: "CFDI", type: "link" },
            { path: "/importar-catalogos", title: "Importar catálogos", type: "link" },
          ],
        },
      ],
    },
  ];

  items = new BehaviorSubject<Menu[]>(this.MENUITEMS);

  /**
   * Filtra el menú según los módulos licenciados del tenant (SaaS).
   * La clave de módulo es el primer segmento del path (p. ej. "workshop").
   *
   * El filtrado es recursivo: los catálogos viven anidados dentro de
   * Configuración pero pertenecen a otros módulos (catalog, cfdi,
   * parts-inventory…), así que cada hoja se evalúa por su propia ruta.
   * Un grupo se conserva solo si le queda al menos un hijo visible.
   */
  applyEnabledModules(mods: string[] | null, roles: string[] = []): void {
    // Hay roles operativos que solo trabajan una parte del sistema. Mostrarles
    // el menú completo no es un detalle estético: al pulsar cualquier otra
    // entrada la API responde 403, así que el menú prometería algo que no es.
    const soloEstos = this.MODULOS_POR_ROL(roles);

    if (!soloEstos && (!mods || mods.length === 0)) {
      this.items.next(this.MENUITEMS);
      return;
    }
    // dashboard, settings y modulos son parte del armazón y no dependen de la
    // licencia. Pero a un rol acotado solo se le deja el inicio: configuración
    // y licencias son pantallas de administración que tampoco podría abrir.
    const armazon = soloEstos
      ? ["dashboard"]
      : ["dashboard", "settings", "modulos"];
    const base = soloEstos ?? [...(mods ?? [])];
    const allowed = new Set([...base, ...armazon]);
    const keyOf = (path?: string): string =>
      (path ?? "").split("/")[1] ?? "";

    // Pantallas que son sub-features de un módulo licenciado y viven en una ruta
    // propia: se muestran si su módulo padre está habilitado.
    const ALIAS: Record<string, string[]> = {
      "service-surveys": ["workshop"],
      "sale-surveys": ["sales"],
      "sales-appointments": ["sales"],
      deliveries: ["workshop", "sales"],
      // Importar catálogos vive en Configuración → Catálogos y no es un módulo
      // propio; se muestra si el tenant tiene almacén o inventario de refacciones.
      "importar-catalogos": ["warehouse", "parts-inventory"],
    };
    const permitido = (path?: string): boolean => {
      const key = keyOf(path);
      if (allowed.has(key)) return true;
      const padres = ALIAS[key];
      return !!padres && padres.some((p) => allowed.has(p));
    };

    const prune = (items: Menu[]): Menu[] =>
      items.reduce<Menu[]>((acc, item) => {
        if (item.children?.length) {
          const children = prune(item.children);
          if (children.length) acc.push({ ...item, children });
          return acc;
        }
        if (permitido(item.path)) acc.push(item);
        return acc;
      }, []);

    this.items.next(prune(this.MENUITEMS));
  }

  /**
   * Módulos que un rol puede tocar, cuando su alcance es más estrecho que el
   * del tenant. `null` = sin restricción propia; manda la licencia.
   */
  private MODULOS_POR_ROL(roles: string[]): string[] | null {
    if (roles.includes("RECEPTIONIST")) return ["reception"];
    return null;
  }
}
