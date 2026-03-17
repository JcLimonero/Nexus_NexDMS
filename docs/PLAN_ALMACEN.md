# Plan de Implementación — Módulo de Almacén

## Objetivo
Reemplazar el placeholder de `almacen` por el módulo completo con Transferencias y Apartados de unidades, siguiendo el flujo Plan-Ejecuta-Valida.

## API existente

### Transferencias (warehouse-transfers)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Transferencias | GET | `/api/v1/warehouse-transfers` | Lista: originBranchId, destinationBranchId, status, page, limit |
| Transferencias | GET | `/api/v1/warehouse-transfers/:id` | Detalle con items y partes |
| Transferencias | POST | `/api/v1/warehouse-transfers` | Crear |
| Transferencias | PATCH | `/api/v1/warehouse-transfers/:id` | Actualizar (solo PENDING) |
| Transferencias | POST | `/api/v1/warehouse-transfers/:id/approve` | Aprobar (PENDING → APPROVED) |
| Transferencias | POST | `/api/v1/warehouse-transfers/:id/send` | Enviar (APPROVED → IN_TRANSIT) |
| Transferencias | POST | `/api/v1/warehouse-transfers/:id/receive` | Recibir (IN_TRANSIT → RECEIVED) |
| Transferencias | POST | `/api/v1/warehouse-transfers/:id/cancel` | Cancelar |

### Estados de transferencia
- PENDING: Pendiente de aprobación
- APPROVED: Aprobada
- IN_TRANSIT: En tránsito
- RECEIVED: Recibida
- CANCELLED: Cancelada

### Tipos de transferencia
- INTRA_BRAND: Entre sucursales misma marca
- INTER_BRAND: Entre sucursales distinta marca

### Apartados (unit-reservations)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Apartados | GET | `/api/v1/unit-reservations` | Lista: status, catalogUnitId, clientId, branchId |
| Apartados | GET | `/api/v1/unit-reservations/:id` | Detalle |
| Apartados | POST | `/api/v1/unit-reservations` | Crear |
| Apartados | POST | `/api/v1/unit-reservations/:id/release` | Liberar apartado |

### Estados de apartado
- ACTIVE: Activo
- CONVERTED: Convertido a venta
- RELEASED: Liberado

## Orden de implementación

### 1. Modelos
- [x] `models/warehouse-transfer.model.ts` — WarehouseTransfer, WarehouseTransferItem, status, type, filters, DTOs
- [x] `models/unit-reservation.model.ts` — UnitReservation, status, filters, DTOs

### 2. Servicio
- [x] `almacen.service.ts` — WarehouseTransfers, UnitReservations

### 3. Rutas
- [x] `almacen.routes.ts` — Transferencias (list, nueva, :id), Apartados (list, nuevo, :id)

### 4. Transferencias
- [x] `transferencias/list/transferencias-list.ts` + html + scss
- [x] `transferencias/form/transferencia-form.ts` + html + scss
- [x] `transferencias/detail/transferencia-detail.ts` + html + scss (con acciones: aprobar, enviar, recibir, cancelar)

### 5. Apartados
- [x] `apartados/list/apartados-list.ts` + html + scss
- [x] `apartados/form/apartado-form.ts` + html + scss
- [x] `apartados/detail/apartado-detail.ts` + html + scss (con acción: liberar)

### 6. Integración
- [x] `content-routes.ts` — cargar almacen.routes
- [x] `nav.service.ts` — rutas reales: /almacen/transferencias, /almacen/apartados

## Validación
- [x] Build web exitoso
- [x] Navegación funcional
