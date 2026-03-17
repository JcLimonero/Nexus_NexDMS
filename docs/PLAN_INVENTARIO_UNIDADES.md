# Plan de Implementación — Inventario de Unidades

## Objetivo
Reemplazar el placeholder de `inventario-unidades` por el módulo completo con Catálogo de Unidades (vehículos en inventario) y Ubicaciones de Unidades (patio, exhibición, almacén).

## API Base

| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Unidades | GET | `/api/v1/catalog-units` | Lista con filtros: vehicleType, brand, status, searchScope, branchId, search, page, limit |
| Unidades | GET | `/api/v1/catalog-units/scan?serialNumber=&branchId=` | Escaneo por número de serie |
| Unidades | GET | `/api/v1/catalog-units/:id` | Detalle |
| Unidades | POST | `/api/v1/catalog-units` | Crear |
| Unidades | PATCH | `/api/v1/catalog-units/:id` | Actualizar |
| Unidades | PATCH | `/api/v1/catalog-units/:id/location` | Actualizar ubicación |
| Ubicaciones | GET | `/api/v1/unit-locations?branchId=` | Lista por sucursal |
| Ubicaciones | GET | `/api/v1/unit-locations/:id` | Detalle |
| Ubicaciones | POST | `/api/v1/unit-locations` | Crear |
| Ubicaciones | PATCH | `/api/v1/unit-locations/:id` | Actualizar |

## Modelos

### CatalogUnit
- `id`, `tenantId`, `branchId`, `globalModelId`
- `vehicleType`: MOTORCYCLE | CAR
- `brand`, `model`, `year`, `version`, `color`
- `serialNumber`, `engineNumber`, `displacement`, `doorCount`
- `costPrice`, `listPrice`, `salePrice`
- `status`: AVAILABLE | RESERVED | SOLD | WRITTEN_OFF
- `locationId`, `imageKey`, `imagesKeys`, `notes`
- `acquisitionDate`, `lastServiceDate`, `lastServiceMileage`, `nextServiceDate`, `nextServiceMileage`

### UnitLocation
- `id`, `tenantId`, `branchId`, `code`, `zone`, `space`, `description`, `isActive`
- `zone`: LOT | EXHIBITION | WAREHOUSE

## Orden de implementación

### 1. Modelos
- [x] `models/catalog-unit.model.ts` — CatalogUnit, CatalogUnitVehicleType, CatalogUnitStatus, CatalogUnitFilters, CreateCatalogUnitDto
- [x] `models/unit-location.model.ts` — UnitLocation, UnitLocationZone, CreateUnitLocationDto

### 2. Servicio
- [x] `inventario-unidades.service.ts` — métodos para catalog-units y unit-locations
- [x] Reutilizar `BranchesService` desde inventario-refacciones

### 3. Rutas
- [x] `inventario-unidades.routes.ts` — Rutas para unidades y ubicaciones (ubicaciones antes de :id para evitar conflicto)

### 4. Ubicaciones de unidades
- [x] `ubicaciones/list/ubicaciones-list.ts` + html + scss
- [x] `ubicaciones/form/ubicacion-form.ts` + html + scss

### 5. Catálogo de unidades
- [x] `unidades/list/unidades-list.ts` + html + scss
- [x] `unidades/form/unidad-form.ts` + html + scss
- [x] `unidades/detail/unidad-detail.ts` + html + scss

### 6. Integración
- [x] Actualizar `content-routes.ts` — cambiar placeholder por rutas reales
- [x] Actualizar `nav.service.ts` — rutas correctas: Unidades, Ubicaciones

## Estructura de archivos

```
apps/web/src/app/features/inventario-unidades/
├── inventario-unidades.routes.ts
├── inventario-unidades.service.ts
├── models/
│   ├── catalog-unit.model.ts
│   └── unit-location.model.ts
├── servicios/
│   └── branches.service.ts  (o importar desde inventario-refacciones)
├── unidades/
│   ├── list/
│   │   ├── unidades-list.ts
│   │   ├── unidades-list.html
│   │   └── unidades-list.scss
│   ├── detail/
│   │   ├── unidad-detail.ts
│   │   ├── unidad-detail.html
│   │   └── unidad-detail.scss
│   └── form/
│       ├── unidad-form.ts
│       ├── unidad-form.html
│       └── unidad-form.scss
└── ubicaciones/
    ├── list/
    │   ├── ubicaciones-list.ts
    │   ├── ubicaciones-list.html
    │   └── ubicaciones-list.scss
    └── form/
        ├── ubicacion-form.ts
        ├── ubicacion-form.html
        └── ubicacion-form.scss
```

## Rutas objetivo

- `/inventario-unidades` → lista de unidades
- `/inventario-unidades/nuevo` → nueva unidad
- `/inventario-unidades/:id` → detalle unidad
- `/inventario-unidades/:id/editar` → editar unidad
- `/inventario-unidades/ubicaciones` → ubicaciones
- `/inventario-unidades/ubicaciones/nueva` → nueva ubicación
- `/inventario-unidades/ubicaciones/:id/editar` → editar ubicación

## Dependencias

- **Unidades** requiere: branches (select), global-models (select opcional para vincular modelo), unit-locations (select para ubicación)
- **Ubicaciones** requiere: branches (select)
- Servicio catálogo: `CatalogoService` o `GlobalModelsService` para selector de modelo global (opcional)
- Servicio branches: reutilizar de `inventario-refacciones/services/branches.service.ts` o mover a `shared`

## Convenciones

- Componentes standalone con `inject()`
- Bootstrap 5 + SCSS del proyecto
- Textos en español
- Toastr para feedback
- Patrón similar a `inventario-refacciones` y `clientes`

## Notas

- Las unidades no tienen DELETE (soft delete con `deletedAt`); el frontend no expondrá eliminación física
- El estado WRITTEN_OFF = "Dado de baja"
- Las zonas de ubicación: LOT = "Patio", EXHIBITION = "Exhibición", WAREHOUSE = "Almacén"
