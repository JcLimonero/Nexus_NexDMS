# Plan de Implementación — Módulo de Compras

## Objetivo
Reemplazar el placeholder de `compras` por el módulo completo con Proveedores y Órdenes de compra, siguiendo el flujo Plan-Ejecuta-Valida.

## API existente

| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Proveedores | GET | `/api/v1/suppliers` | Lista con filtros: search, isActive, page, limit |
| Proveedores | GET | `/api/v1/suppliers/:id` | Detalle |
| Proveedores | POST | `/api/v1/suppliers` | Crear |
| Proveedores | PATCH | `/api/v1/suppliers/:id` | Actualizar |
| Proveedores | DELETE | `/api/v1/suppliers/:id` | Soft delete |
| Órdenes | GET | `/api/v1/purchase-orders` | Lista: supplierId, status, branchId, dateFrom, dateTo, page, limit |
| Órdenes | GET | `/api/v1/purchase-orders/:id` | Detalle con items |
| Órdenes | POST | `/api/v1/purchase-orders` | Crear |
| Órdenes | PATCH | `/api/v1/purchase-orders/:id` | Actualizar |
| Órdenes | POST | `/api/v1/purchase-orders/:id/send` | Enviar (DRAFT → SENT) |
| Órdenes | POST | `/api/v1/purchase-orders/:id/receive` | Recibir (ingresa stock) |
| Órdenes | POST | `/api/v1/purchase-orders/:id/cancel` | Cancelar |

## Estados de orden de compra
- DRAFT: Borrador
- SENT: Enviada al proveedor
- PARTIAL: Parcialmente recibida
- RECEIVED: Recibida completa
- CANCELLED: Cancelada

## Orden de implementación

### 1. Modelos
- [x] `models/supplier.model.ts` — Supplier, SupplierFilters, CreateSupplierDto
- [x] `models/purchase-order.model.ts` — PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, filters, DTOs

### 2. Servicio
- [x] `compras.service.ts` — Suppliers, PurchaseOrders

### 3. Rutas
- [x] `compras.routes.ts` — Proveedores (list, nuevo, :id/editar), Órdenes (list, nueva, :id)

### 4. Proveedores
- [x] `proveedores/list/proveedores-list.ts` + html + scss
- [x] `proveedores/form/proveedor-form.ts` + html + scss

### 5. Órdenes de compra
- [x] `ordenes-compra/list/ordenes-compra-list.ts` + html + scss
- [x] `ordenes-compra/form/orden-compra-form.ts` + html + scss
- [x] `ordenes-compra/detail/orden-compra-detail.ts` + html + scss (con acciones: enviar, recibir, cancelar)

### 6. Integración
- [x] Actualizar `content-routes.ts` — cambiar placeholder por rutas reales
- [x] Actualizar `nav.service.ts` — submenú Proveedores, Órdenes de compra

## Dependencias
- BranchesService (selector sucursal) — reutilizar de inventario-refacciones
- InventarioRefaccionesService.getParts (selector de partes para líneas de OC)
- API base: `/api/v1/suppliers`, `/api/v1/purchase-orders`

## Estructura de archivos

```
apps/web/src/app/features/compras/
├── compras.routes.ts
├── compras.service.ts
├── models/
│   ├── supplier.model.ts
│   └── purchase-order.model.ts
├── proveedores/
│   ├── list/
│   │   ├── proveedores-list.ts
│   │   ├── proveedores-list.html
│   │   └── proveedores-list.scss
│   └── form/
│       ├── proveedor-form.ts
│       ├── proveedor-form.html
│       └── proveedor-form.scss
└── ordenes-compra/
    ├── list/
    │   ├── ordenes-compra-list.ts
    │   ├── ordenes-compra-list.html
    │   └── ordenes-compra-list.scss
    ├── form/
    │   ├── orden-compra-form.ts
    │   ├── orden-compra-form.html
    │   └── orden-compra-form.scss
    └── detail/
        ├── orden-compra-detail.ts
        ├── orden-compra-detail.html
        └── orden-compra-detail.scss
```
