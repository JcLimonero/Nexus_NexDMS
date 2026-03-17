# Plan de Implementación — Módulo Garantías

## Objetivo
Reemplazar el placeholder de `garantias` por el módulo de Garantías, siguiendo el flujo Plan-Ejecuta-Valida.

## API existente

### Garantías (`/api/v1/warranties`)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Listar | GET | `/api/v1/warranties` | clientId?, status?, type?, branchId?, page?, limit? |
| Detalle | GET | `/api/v1/warranties/:id` | Con client, vehicle, branch, authorizer, unitSale, serviceOrder |
| Crear | POST | `/api/v1/warranties` | clientId, vehicleId, branchId, type, description, startDate, endDate, unitSaleId?, serviceOrderId? |
| Autorizar | POST | `/api/v1/warranties/:id/authorize` | Body: createServiceOrder?, notes? (roles: MANAGER+) |
| Resolver | POST | `/api/v1/warranties/:id/resolve` | Body: resolution |
| Rechazar | POST | `/api/v1/warranties/:id/reject` | Body: reason? (roles: MANAGER+) |

### Estados
- OPEN: Abierta
- IN_PROGRESS: En progreso
- RESOLVED: Resuelta
- REJECTED: Rechazada

### Tipos
- UNIT: Unidad
- PART: Refacción
- SERVICE: Servicio

### APIs auxiliares
- Clientes: GET `/api/v1/clients` (listado)
- Vehículos del cliente: GET `/api/v1/clients/:clientId/vehicles`
- Sucursales: GET `/api/v1/branches`
- Ventas de unidad: GET `/api/v1/unit-sales?clientId=`
- Órdenes de servicio: GET `/api/v1/service-orders?clientId=`

## Orden de implementación

### 1. Modelos
- [x] `models/warranty.model.ts` — Warranty, WarrantyFilters, CreateWarrantyDto, WarrantyStatus, WarrantyType

### 2. Servicio
- [x] `garantias.service.ts` — getWarranties, getWarranty, createWarranty, authorize, resolve, reject
- [x] Métodos auxiliares: getVehiclesByClient, getUnitSalesByClient, getServiceOrdersByClient

### 3. Rutas
- [x] `garantias.routes.ts` — list, nueva, :id

### 4. Componentes
- [x] `garantias-list/garantias-list.ts` — Lista con filtros, paginación
- [x] `garantia-form/garantia-form.ts` — Crear garantía (cliente, vehículo, sucursal, tipo, origen, descripción, fechas)
- [x] `garantia-detail/garantia-detail.ts` — Ver, autorizar, resolver, rechazar

### 5. Integración
- [x] `content-routes.ts` — cargar garantias.routes
- [x] `nav.service.ts` — ruta: /garantias (ya existía)

### 6. API
- [x] Corregir orderBy: `w.created_at` → `w.createdAt`

## Validación
- [x] Build web exitoso
- [x] Navegación funcional
