/**
 * Registro centralizado de combos (dropdowns/selects) en NexDMS.
 * Mapea cada combo a su servicio y API correspondiente.
 * Usado por el skill validate-combo-loading para auditoría.
 *
 * @see .cursor/skills/validate-combo-loading/SKILL.md
 */

export interface ComboRegistryEntry {
  /** Componente que usa el combo (ej. VentaUnidadForm) */
  component: string;
  /** Archivo del componente (ruta relativa a apps/web/src) */
  file: string;
  /** Campo del formulario o variable que alimenta el combo */
  field: string;
  /** Servicio que provee los datos */
  service: string;
  /** Método del servicio que se debe llamar */
  method: string;
  /** API REST que usa el servicio */
  api: string;
  /** Si el combo depende de otro campo (ej. ubicaciones dependen de branchId) */
  dependsOn?: string;
  /** Tipo: form | list | detail */
  type: "form" | "list" | "detail";
}

export const COMBO_REGISTRY: ComboRegistryEntry[] = [
  // --- Venta Unidad Form ---
  {
    component: "VentaUnidadForm",
    file: "app/features/ventas-unidades/form/venta-unidad-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },
  {
    component: "VentaUnidadForm",
    file: "app/features/ventas-unidades/form/venta-unidad-form.ts",
    field: "clientId",
    service: "ClientesService",
    method: "getAll",
    api: "/api/v1/clients",
    type: "form",
  },
  {
    component: "VentaUnidadForm",
    file: "app/features/ventas-unidades/form/venta-unidad-form.ts",
    field: "catalogUnitId",
    service: "InventarioUnidadesService",
    method: "getUnits",
    api: "/api/v1/catalog-units",
    dependsOn: "branchId",
    type: "form",
  },
  {
    component: "VentaUnidadForm",
    file: "app/features/ventas-unidades/form/venta-unidad-form.ts",
    field: "accessories",
    service: "VentasUnidadesService",
    method: "getCompatibleAccessories",
    api: "/api/v1/unit-accessories/compatible",
    dependsOn: "catalogUnitId",
    type: "form",
  },

  // --- Orden Servicio Form ---
  {
    component: "OrdenServicioForm",
    file: "app/features/taller/ordenes-servicio/form/orden-servicio-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },
  {
    component: "OrdenServicioForm",
    file: "app/features/taller/ordenes-servicio/form/orden-servicio-form.ts",
    field: "ownerId",
    service: "ClientesService",
    method: "getAll",
    api: "/api/v1/clients",
    type: "form",
  },
  {
    component: "OrdenServicioForm",
    file: "app/features/taller/ordenes-servicio/form/orden-servicio-form.ts",
    field: "vehicleId",
    service: "TallerService",
    method: "getVehiclesByClient",
    api: "/api/v1/clients/:clientId/vehicles",
    dependsOn: "ownerId",
    type: "form",
  },
  {
    component: "OrdenServicioForm",
    file: "app/features/taller/ordenes-servicio/form/orden-servicio-form.ts",
    field: "mechanicId",
    service: "TallerService",
    method: "getMechanicsForBranch",
    api: "/api/v1/user-availability/mechanics-with-details",
    dependsOn: "branchId",
    type: "form",
  },

  // --- Cotización Form ---
  {
    component: "CotizacionForm",
    file: "app/features/cotizaciones/form/cotizacion-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },
  {
    component: "CotizacionForm",
    file: "app/features/cotizaciones/form/cotizacion-form.ts",
    field: "clientId",
    service: "ClientesService",
    method: "getAll",
    api: "/api/v1/clients",
    type: "form",
  },
  {
    component: "CotizacionForm",
    file: "app/features/cotizaciones/form/cotizacion-form.ts",
    field: "catalogUnitId",
    service: "InventarioUnidadesService",
    method: "getUnits",
    api: "/api/v1/catalog-units",
    dependsOn: "branchId",
    type: "form",
  },

  // --- Venta (Caja) Form ---
  {
    component: "VentaForm",
    file: "app/features/caja-ventas/ventas/form/venta-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },
  {
    component: "VentaForm",
    file: "app/features/caja-ventas/ventas/form/venta-form.ts",
    field: "clientId",
    service: "ClientesService",
    method: "getAll",
    api: "/api/v1/clients",
    type: "form",
  },

  // --- Orden Compra Form ---
  {
    component: "OrdenCompraForm",
    file: "app/features/compras/ordenes-compra/form/orden-compra-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },
  {
    component: "OrdenCompraForm",
    file: "app/features/compras/ordenes-compra/form/orden-compra-form.ts",
    field: "supplierId",
    service: "ComprasService",
    method: "getSuppliers",
    api: "/api/v1/suppliers",
    type: "form",
  },

  // --- Parte Form (Inventario Refacciones) ---
  {
    component: "ParteForm",
    file: "app/features/inventario-refacciones/partes/form/parte-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },
  {
    component: "ParteForm",
    file: "app/features/inventario-refacciones/partes/form/parte-form.ts",
    field: "categoryId",
    service: "InventarioRefaccionesService",
    method: "getCategories",
    api: "/api/v1/part-categories",
    type: "form",
  },
  {
    component: "ParteForm",
    file: "app/features/inventario-refacciones/partes/form/parte-form.ts",
    field: "locationId",
    service: "InventarioRefaccionesService",
    method: "getLocations",
    api: "/api/v1/stock-locations",
    dependsOn: "branchId",
    type: "form",
  },

  // --- Ubicación Form (Inventario Refacciones) ---
  {
    component: "UbicacionForm",
    file: "app/features/inventario-refacciones/ubicaciones/form/ubicacion-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },

  // --- Ubicación Form (Inventario Unidades) ---
  {
    component: "UbicacionForm",
    file: "app/features/inventario-unidades/ubicaciones/form/ubicacion-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },

  // --- Unidad Form ---
  {
    component: "UnidadForm",
    file: "app/features/inventario-unidades/unidades/form/unidad-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },
  {
    component: "UnidadForm",
    file: "app/features/inventario-unidades/unidades/form/unidad-form.ts",
    field: "vehicleType",
    service: "VehicleTypesService",
    method: "getAll",
    api: "/api/v1/vehicle-types",
    type: "form",
  },
  {
    component: "UnidadForm",
    file: "app/features/inventario-unidades/unidades/form/unidad-form.ts",
    field: "brand",
    service: "CatalogoService",
    method: "getBrands",
    api: "/api/v1/global-models/brands",
    dependsOn: "vehicleType",
    type: "form",
  },
  {
    component: "UnidadForm",
    file: "app/features/inventario-unidades/unidades/form/unidad-form.ts",
    field: "locationId",
    service: "InventarioUnidadesService",
    method: "getLocations",
    api: "/api/v1/unit-locations",
    dependsOn: "branchId",
    type: "form",
  },

  // --- Transferencia Form ---
  {
    component: "TransferenciaForm",
    file: "app/features/almacen/transferencias/form/transferencia-form.ts",
    field: "originBranchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },
  {
    component: "TransferenciaForm",
    file: "app/features/almacen/transferencias/form/transferencia-form.ts",
    field: "destinationBranchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },

  // --- Apartado Form ---
  {
    component: "ApartadoForm",
    file: "app/features/almacen/apartados/form/apartado-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },
  {
    component: "ApartadoForm",
    file: "app/features/almacen/apartados/form/apartado-form.ts",
    field: "clientId",
    service: "ClientesService",
    method: "getAll",
    api: "/api/v1/clients",
    type: "form",
  },
  {
    component: "ApartadoForm",
    file: "app/features/almacen/apartados/form/apartado-form.ts",
    field: "catalogUnitId",
    service: "InventarioUnidadesService",
    method: "getUnits",
    api: "/api/v1/catalog-units",
    dependsOn: "branchId",
    type: "form",
  },

  // --- Garantía Form ---
  {
    component: "GarantiaForm",
    file: "app/features/garantias/garantia-form/garantia-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },
  {
    component: "GarantiaForm",
    file: "app/features/garantias/garantia-form/garantia-form.ts",
    field: "clientId",
    service: "ClientesService",
    method: "getAll",
    api: "/api/v1/clients",
    type: "form",
  },
  {
    component: "GarantiaForm",
    file: "app/features/garantias/garantia-form/garantia-form.ts",
    field: "vehicleId",
    service: "GarantiasService",
    method: "getVehiclesByClient",
    api: "/api/v1/clients/:clientId/vehicles",
    dependsOn: "clientId",
    type: "form",
  },

  // --- Lista Precio Form ---
  {
    component: "ListaPrecioForm",
    file: "app/features/caja-ventas/listas-precio/form/lista-precio-form.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "form",
  },

  // --- Modelo Global Form ---
  {
    component: "VarianteForm",
    file: "app/features/catalogo/variantes/form/variante-form.ts",
    field: "vehicleTypeId",
    service: "VehicleTypesService",
    method: "getAll",
    api: "/api/v1/vehicle-types",
    type: "form",
  },
  {
    component: "VarianteForm",
    file: "app/features/catalogo/variantes/form/variante-form.ts",
    field: "combustionTypeId",
    service: "CombustionTypesService",
    method: "getAll",
    api: "/api/v1/combustion-types",
    type: "form",
  },
  {
    component: "VarianteForm",
    file: "app/features/catalogo/variantes/form/variante-form.ts",
    field: "brandId",
    service: "GlobalBrandsService",
    method: "getAll",
    api: "/api/v1/global-brands",
    type: "form",
  },

  // --- Cliente Form ---
  {
    component: "ClienteForm",
    file: "app/features/clientes/form/cliente-form.ts",
    field: "clientType",
    service: "ClientTypesService",
    method: "getAll",
    api: "/api/v1/client-types",
    type: "form",
  },

  // --- Unidad Recompra ---
  {
    component: "UnidadRecompra",
    file: "app/features/inventario-unidades/unidades/recompra/unidad-recompra.ts",
    field: "clientId",
    service: "ClientesService",
    method: "getAll",
    api: "/api/v1/clients",
    type: "form",
  },

  // --- Vehículo Quick Dialog ---
  {
    component: "VehiculoQuickDialog",
    file: "app/features/taller/ordenes-servicio/dialogs/vehiculo-quick-dialog/vehiculo-quick-dialog.ts",
    field: "vehicleType",
    service: "VehicleTypesService",
    method: "getAll",
    api: "/api/v1/vehicle-types",
    type: "form",
  },
  {
    component: "VehiculoQuickDialog",
    file: "app/features/taller/ordenes-servicio/dialogs/vehiculo-quick-dialog/vehiculo-quick-dialog.ts",
    field: "make",
    service: "CatalogoService",
    method: "getBrands",
    api: "/api/v1/global-models/brands",
    dependsOn: "vehicleType",
    type: "form",
  },

  // --- Listas (filtros) ---
  {
    component: "UnidadesList",
    file: "app/features/inventario-unidades/unidades/list/unidades-list.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "list",
  },
  {
    component: "UnidadesList",
    file: "app/features/inventario-unidades/unidades/list/unidades-list.ts",
    field: "vehicleType",
    service: "VehicleTypesService",
    method: "getAll",
    api: "/api/v1/vehicle-types",
    type: "list",
  },
  {
    component: "PartesList",
    file: "app/features/inventario-refacciones/partes/list/partes-list.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "list",
  },
  {
    component: "PartesList",
    file: "app/features/inventario-refacciones/partes/list/partes-list.ts",
    field: "categoryId",
    service: "InventarioRefaccionesService",
    method: "getCategories",
    api: "/api/v1/part-categories",
    type: "list",
  },
  {
    component: "OrdenesCompraList",
    file: "app/features/compras/ordenes-compra/list/ordenes-compra-list.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "list",
  },
  {
    component: "OrdenesCompraList",
    file: "app/features/compras/ordenes-compra/list/ordenes-compra-list.ts",
    field: "supplierId",
    service: "ComprasService",
    method: "getSuppliers",
    api: "/api/v1/suppliers",
    type: "list",
  },
  {
    component: "ClientesList",
    file: "app/features/clientes/list/clientes-list.ts",
    field: "clientType",
    service: "ClientTypesService",
    method: "getAll",
    api: "/api/v1/client-types",
    type: "list",
  },
  {
    component: "OrdenesServicioList",
    file: "app/features/taller/ordenes-servicio/list/ordenes-servicio-list.ts",
    field: "branchId",
    service: "BranchesService",
    method: "getAll",
    api: "/api/v1/branches",
    type: "list",
  },
  {
    component: "OrdenesServicioList",
    file: "app/features/taller/ordenes-servicio/list/ordenes-servicio-list.ts",
    field: "mechanicId",
    service: "TallerService",
    method: "getMechanicsForBranch",
    api: "/api/v1/user-availability/mechanics-with-details",
    dependsOn: "branchId",
    type: "list",
  },
];
