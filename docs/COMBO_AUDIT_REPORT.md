# Auditoría de Combos — 2026-03-17

## OK (implementación correcta)

| Componente | Campo | Servicio | API |
|------------|-------|----------|-----|
| VentaUnidadForm | branchId | BranchesService | /api/v1/branches |
| VentaUnidadForm | clientId | ClientesService | /api/v1/clients |
| VentaUnidadForm | catalogUnitId | InventarioUnidadesService | /api/v1/catalog-units |
| VentaUnidadForm | accessories | VentasUnidadesService | /api/v1/unit-accessories/compatible |
| OrdenServicioForm | branchId | BranchesService | /api/v1/branches |
| OrdenServicioForm | ownerId | ClientesService | /api/v1/clients |
| OrdenServicioForm | vehicleId | TallerService | /api/v1/clients/:clientId/vehicles |
| OrdenServicioForm | mechanicId | TallerService | /api/v1/user-availability/mechanics-with-details |
| CotizacionForm | branchId | BranchesService | /api/v1/branches |
| CotizacionForm | clientId | ClientesService | /api/v1/clients |
| CotizacionForm | catalogUnitId | InventarioUnidadesService | /api/v1/catalog-units |
| VentaForm | branchId | BranchesService | /api/v1/branches |
| VentaForm | clientId | ClientesService | /api/v1/clients |
| OrdenCompraForm | branchId | BranchesService | /api/v1/branches |
| OrdenCompraForm | supplierId | ComprasService | /api/v1/suppliers |
| ParteForm | branchId | BranchesService | /api/v1/branches |
| ParteForm | categoryId | InventarioRefaccionesService | /api/v1/part-categories |
| ParteForm | locationId | InventarioRefaccionesService | /api/v1/stock-locations |
| UbicacionForm | branchId | BranchesService | /api/v1/branches |
| UbicacionForm | branchId | BranchesService | /api/v1/branches |
| UnidadForm | branchId | BranchesService | /api/v1/branches |
| UnidadForm | vehicleType | VehicleTypesService | /api/v1/vehicle-types |
| UnidadForm | brand | CatalogoService | /api/v1/global-models/brands |
| UnidadForm | locationId | InventarioUnidadesService | /api/v1/unit-locations |
| TransferenciaForm | originBranchId | BranchesService | /api/v1/branches |
| TransferenciaForm | destinationBranchId | BranchesService | /api/v1/branches |
| ApartadoForm | branchId | BranchesService | /api/v1/branches |
| ApartadoForm | clientId | ClientesService | /api/v1/clients |
| ApartadoForm | catalogUnitId | InventarioUnidadesService | /api/v1/catalog-units |
| GarantiaForm | branchId | BranchesService | /api/v1/branches |
| GarantiaForm | clientId | ClientesService | /api/v1/clients |
| GarantiaForm | vehicleId | GarantiasService | /api/v1/clients/:clientId/vehicles |
| ListaPrecioForm | branchId | BranchesService | /api/v1/branches |
| ModeloGlobalForm | vehicleTypeId | VehicleTypesService | /api/v1/vehicle-types |
| ModeloGlobalForm | combustionTypeId | CombustionTypesService | /api/v1/combustion-types |
| ModeloGlobalForm | brandId | GlobalBrandsService | /api/v1/global-brands |
| ClienteForm | clientType | ClientTypesService | /api/v1/client-types |
| UnidadRecompra | clientId | ClientesService | /api/v1/clients |
| VehiculoQuickDialog | vehicleType | VehicleTypesService | /api/v1/vehicle-types |
| VehiculoQuickDialog | make | CatalogoService | /api/v1/global-models/brands |
| UnidadesList | branchId | BranchesService | /api/v1/branches |
| UnidadesList | vehicleType | VehicleTypesService | /api/v1/vehicle-types |
| PartesList | branchId | BranchesService | /api/v1/branches |
| PartesList | categoryId | InventarioRefaccionesService | /api/v1/part-categories |
| OrdenesCompraList | branchId | BranchesService | /api/v1/branches |
| OrdenesCompraList | supplierId | ComprasService | /api/v1/suppliers |
| ClientesList | clientType | ClientTypesService | /api/v1/client-types |
| OrdenesServicioList | branchId | BranchesService | /api/v1/branches |
| OrdenesServicioList | mechanicId | TallerService | /api/v1/user-availability/mechanics-with-details |

## Faltantes (en registro pero no implementado correctamente)

Ninguno.

## Posibles combos sin registro

| Archivo | Servicio | Método |
|---------|----------|--------|
| app/features/almacen/apartados/list/apartados-list.ts | BranchesService | getAll |
| app/features/almacen/transferencias/list/transferencias-list.ts | BranchesService | getAll |
| app/features/caja-ventas/caja/sesiones/sesiones-list.ts | BranchesService | getAll |
| app/features/caja-ventas/listas-precio/list/listas-precio-list.ts | BranchesService | getAll |
| app/features/caja-ventas/ventas/list/ventas-list.ts | BranchesService | getAll |
| app/features/catalogo/marcas-globales/list/marcas-globales-list.ts | GlobalBrandsService | getAll |
| app/features/catalogo/modelos-globales/form/modelo-global-form.ts | CatalogoService | getAll |
| app/features/catalogo/modelos-globales/list/modelos-globales-list.ts | CatalogoService | getAll |
| app/features/catalogo/modelos-globales/list/modelos-globales-list.ts | VehicleTypesService | getAll |
| app/features/catalogo/modelos-globales/list/modelos-globales-list.ts | GlobalBrandsService | getAll |
| app/features/catalogo/tipos-combustion/tipos-combustion-list.ts | CombustionTypesService | getAll |
| app/features/catalogo/tipos-vehiculo/tipos-vehiculo-list.ts | VehicleTypesService | getAll |
| app/features/cfdi/detail/cfdi-detail.ts | BranchesService | getAll |
| app/features/cfdi/list/cfdi-list.ts | BranchesService | getAll |
| app/features/clientes/form/cliente-form.ts | ClientesService | getAll |
| app/features/clientes/list/clientes-list.ts | ClientesService | getAll |
| app/features/compras/ordenes-compra/detail/orden-compra-detail.ts | BranchesService | getAll |
| app/features/compras/proveedores/list/proveedores-list.ts | ComprasService | getSuppliers |
| app/features/configuracion/sucursales-list/sucursales-list.ts | BranchesService | getAll |
| app/features/cotizaciones/detail/cotizacion-detail.ts | BranchesService | getAll |
| app/features/cotizaciones/list/cotizaciones-list.ts | BranchesService | getAll |
| app/features/garantias/garantia-detail/garantia-detail.ts | BranchesService | getAll |
| app/features/garantias/garantias-list/garantias-list.ts | BranchesService | getAll |
| app/features/inventario-refacciones/categorias/list/categorias-list.ts | InventarioRefaccionesService | getCategories |
| app/features/inventario-refacciones/ubicaciones/form/ubicacion-form.ts | InventarioRefaccionesService | getLocations |
| app/features/inventario-refacciones/ubicaciones/list/ubicaciones-list.ts | BranchesService | getAll |
| app/features/inventario-refacciones/ubicaciones/list/ubicaciones-list.ts | InventarioRefaccionesService | getLocations |
| app/features/inventario-unidades/ubicaciones/list/ubicaciones-list.ts | BranchesService | getAll |
| app/features/inventario-unidades/ubicaciones/list/ubicaciones-list.ts | InventarioUnidadesService | getLocations |
| app/features/inventario-unidades/unidades/form/unidad-form.ts | CatalogoService | getAll |
| app/features/inventario-unidades/unidades/list/unidades-list.ts | InventarioUnidadesService | getUnits |
| app/features/reportes/comisiones/comision-period-detail.ts | BranchesService | getAll |
| app/features/reportes/comisiones/comision-period-form.ts | BranchesService | getAll |
| app/features/reportes/comisiones/comisiones-list.ts | BranchesService | getAll |
| app/features/taller/ordenes-servicio/detail/orden-servicio-detail.ts | BranchesService | getAll |
| app/features/taller/ordenes-servicio/detail/orden-servicio-detail.ts | TallerService | getMechanicsForBranch |
| app/features/ventas-unidades/list/ventas-unidades-list.ts | BranchesService | getAll |

---

*Generado por `node .cursor/skills/validate-combo-loading/scripts/audit-combos.js`*