# Plan de Implementación — Inventario de Refacciones

## Objetivo
Reemplazar el placeholder de `inventario-refacciones` por el módulo completo con Partes, Categorías y Ubicaciones.

## Orden de implementación

### 1. Modelos
- [ ] `models/part.model.ts` — Part, PartVehicleType, PartFilters, CreatePartDto
- [ ] `models/part-category.model.ts` — PartCategory, PartCategoryFilters
- [ ] `models/stock-location.model.ts` — StockLocation

### 2. Servicio
- [ ] `inventario-refacciones.service.ts` — PartesService, PartCategoriesService, StockLocationsService (o un servicio unificado)

### 3. Rutas
- [ ] `inventario-refacciones.routes.ts` — Rutas para partes, categorías, ubicaciones

### 4. Categorías
- [ ] `categorias/list/categorias-list.ts` + html + scss
- [ ] `categorias/form/categoria-form.ts` + html + scss

### 5. Ubicaciones
- [ ] `ubicaciones/list/ubicaciones-list.ts` + html + scss
- [ ] `ubicaciones/form/ubicacion-form.ts` + html + scss

### 6. Partes
- [ ] `partes/list/partes-list.ts` + html + scss
- [ ] `partes/form/parte-form.ts` + html + scss
- [ ] `partes/detail/parte-detail.ts` + html + scss

### 7. Integración
- [ ] Actualizar `content-routes.ts` — cambiar placeholder por rutas reales
- [ ] Actualizar `nav.service.ts` — rutas correctas para submenú

## API Base
- Partes: `/api/v1/parts`
- Categorías: `/api/v1/part-categories`
- Ubicaciones: `/api/v1/stock-locations`

## Dependencias
- Partes requiere: categorías (select), ubicaciones (select), branches (select)
- Servicios: BranchesService para selector de sucursal (si aplica)
