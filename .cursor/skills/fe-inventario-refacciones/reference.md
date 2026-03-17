# Inventario Refacciones — Referencia API y Plan

## API Endpoints

| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Partes | GET | `/api/v1/parts` | Lista con filtros: search, categoryId, vehicleType, branchId, searchScope, page, limit |
| Partes | GET | `/api/v1/parts/scan?code=&branchId=` | Escaneo por código de barras/SKU |
| Partes | GET | `/api/v1/parts/alerts` | Alertas de stock bajo |
| Partes | GET | `/api/v1/parts/:id` | Detalle |
| Partes | POST | `/api/v1/parts` | Crear |
| Partes | PATCH | `/api/v1/parts/:id` | Actualizar |
| Partes | PATCH | `/api/v1/parts/:id/location` | Actualizar ubicación |
| Partes | DELETE | `/api/v1/parts/:id` | Soft delete |
| Categorías | GET | `/api/v1/part-categories` | Lista |
| Categorías | POST | `/api/v1/part-categories` | Crear |
| Categorías | PATCH | `/api/v1/part-categories/:id` | Actualizar |
| Ubicaciones | GET | `/api/v1/stock-locations?branchId=` | Lista por sucursal |
| Ubicaciones | POST | `/api/v1/stock-locations` | Crear |
| Ubicaciones | PATCH | `/api/v1/stock-locations/:id` | Actualizar |

## Modelos

### Part
```typescript
export enum PartVehicleType {
  MOTORCYCLE = 'MOTORCYCLE',
  CAR = 'CAR',
  BOTH = 'BOTH',
}

export interface Part {
  id: string;
  tenantId: string;
  branchId: string;
  categoryId: string | null;
  locationId: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  vehicleType: PartVehicleType;
  compatibleMakes: string | null;
  unitOfMeasure: string;
  purchasePrice: number;
  publicPrice: number;
  wholesalePrice: number;
  businessPrice: number;
  maxDiscountPct: number;
  stockQuantity: number;
  minStock: number;
  maxStock: number | null;
  imageKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### PartCategory
```typescript
export interface PartCategory {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
}
```

### StockLocation
```typescript
export interface StockLocation {
  id: string;
  tenantId: string;
  branchId: string;
  code: string;
  name: string;
  description: string | null;
}
```

## Estructura de archivos a crear

```
apps/web/src/app/features/inventario-refacciones/
├── inventario-refacciones.routes.ts
├── inventario-refacciones.service.ts
├── models/
│   ├── part.model.ts
│   ├── part-category.model.ts
│   └── stock-location.model.ts
├── partes/
│   ├── list/
│   │   ├── partes-list.ts
│   │   ├── partes-list.html
│   │   └── partes-list.scss
│   ├── detail/
│   │   ├── parte-detail.ts
│   │   ├── parte-detail.html
│   │   └── parte-detail.scss
│   ├── form/
│   │   ├── parte-form.ts
│   │   ├── parte-form.html
│   │   └── parte-form.scss
│   └── scan/
│       ├── parte-scan.ts
│       ├── parte-scan.html
│       └── parte-scan.scss
├── categorias/
│   ├── list/
│   │   ├── categorias-list.ts
│   │   ├── categorias-list.html
│   │   └── categorias-list.scss
│   └── form/
│       ├── categoria-form.ts
│       ├── categoria-form.html
│       └── categoria-form.scss
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

## Orden de implementación sugerido

1. Modelos (`part.model.ts`, etc.)
2. Servicio (`inventario-refacciones.service.ts`)
3. Rutas (`inventario-refacciones.routes.ts`)
4. Categorías (list + form) — más simple, sin dependencias
5. Ubicaciones (list + form) — más simple
6. Partes list (con filtros, paginación)
7. Partes form (crear/editar)
8. Partes detail
9. Partes scan (opcional, para escaneo con cámara/pistola)
10. Actualizar `content-routes.ts`: cambiar placeholder por rutas reales

## Integración en content-routes

```typescript
{
  path: "inventario-refacciones",
  data: { breadcrumb: "Inventario refacciones" },
  loadChildren: () =>
    import("../../../app/features/inventario-refacciones/inventario-refacciones.routes").then(
      (r) => r.inventarioRefaccionesRoutes,
    ),
},
```

## Convenciones

- Componentes standalone con `imports` explícitos
- `inject()` en lugar de constructor
- Bootstrap 5 + SCSS del proyecto
- Textos en español
- Toastr para feedback
- AuthInterceptor añade token automáticamente
