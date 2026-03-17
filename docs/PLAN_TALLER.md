# Plan de Implementación — Módulo Taller

## Objetivo
Reemplazar el placeholder de `taller` por el módulo de Órdenes de servicio, siguiendo el flujo Plan-Ejecuta-Valida. Agenda y Citas quedan como placeholders para futuros desarrollos.

## API existente

### Órdenes de servicio (`/api/v1/service-orders`)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Listar | GET | `/api/v1/service-orders` | clientId?, mechanicId?, status?, branchId?, dateFrom?, dateTo?, page?, limit? |
| Detalle | GET | `/api/v1/service-orders/:id` | Con owner, vehicle, parts, checklist, etc. |
| Crear | POST | `/api/v1/service-orders` | ownerId, vehicleId, branchId, reportedFault, kmIn, receptionContactId?, mechanicId?, appointmentId?, serviceTypeId?, quotationId?, promisedAt?, notes? |
| Actualizar | PATCH | `/api/v1/service-orders/:id` | |
| Cambiar estado | POST | `/api/v1/service-orders/:id/change-status` | Body: status, notes? |
| Asignar mecánico | POST | `/api/v1/service-orders/:id/assign-mechanic` | Body: mechanicId |
| Entregar | POST | `/api/v1/service-orders/:id/deliver` | Body: paymentMethod, laborCost, kmOut?, cfdiUuid? |
| Cancelar | POST | `/api/v1/service-orders/:id/cancel` | |

### Estados
- RECEIVED: Recibida
- DIAGNOSIS: Diagnóstico
- IN_PROGRESS: En progreso
- WAITING_PARTS: Esperando refacciones
- READY: Lista para entregar
- DELIVERED: Entregada
- CANCELLED: Cancelada

### APIs auxiliares
- Vehículos del cliente: GET `/api/v1/clients/:clientId/vehicles`
- Mecánicos por sucursal: GET `/api/v1/user-availability/mechanics?branchId=uuid`
- Tipos de servicio: GET `/api/v1/service-types?branchId=uuid`

## Orden de implementación

### 1. Modelos
- [ ] `models/service-order.model.ts` — ServiceOrder, ServiceOrderFilters, CreateServiceOrderDto

### 2. Servicio
- [ ] `taller.service.ts` — getServiceOrders, getServiceOrder, createServiceOrder, changeStatus, assignMechanic, deliver, cancel
- [ ] Métodos auxiliares: getVehiclesByClient, getMechanics, getServiceTypes

### 3. Rutas
- [ ] `taller.routes.ts` — ordenes-servicio (list), ordenes-servicio/nueva, ordenes-servicio/:id

### 4. Componentes
- [ ] `ordenes-servicio/list/ordenes-servicio-list.ts` — Lista con filtros, paginación
- [ ] `ordenes-servicio/form/orden-servicio-form.ts` — Crear OS (cliente, vehículo, sucursal, falla, km)
- [ ] `ordenes-servicio/detail/orden-servicio-detail.ts` — Ver, cambiar estado, asignar mecánico

### 5. Integración
- [ ] `content-routes.ts` — cargar taller.routes
- [ ] `nav.service.ts` — rutas: /taller/ordenes-servicio, /taller/agenda, /taller/citas

## Validación
- [ ] Build web exitoso
- [ ] Navegación funcional
