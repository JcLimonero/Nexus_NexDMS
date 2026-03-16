# Implementación Agenda de Servicios - Completada

> Documento generado por el Agente de Implementación tras completar las fases 1-5 del plan en `docs/PLAN_IMPLEMENTACION_AGENDA_SERVICIOS.md`.

**Fecha:** 2025-03-16

---

## Estado por Fase

| Fase | Nombre | Estado | Notas |
|------|--------|--------|-------|
| **1** | Catálogo de Tipos de Servicio | ✅ Completada | Migraciones, entidades, módulo service-types, CRUD, getRequiredParts, checkPartsAvailability |
| **2** | Rampas y Slots | ✅ Completada | branch_ramps, service_type_id en appointments, UserAvailabilityService con serviceTypeId, schedulable_days, rampas |
| **3** | Refacciones y Notificaciones | ✅ Completada | MantenimientoSinRefaccionesEvent, getUsersByRoleInBranch, NotificationsListener, AppointmentsService.create con checkPartsAvailability |
| **4** | Servicios Recurrentes y Planeación | ✅ Completada | service_type_id en service_orders, ServicePlanningService, ServiceDueRemindersJob, ServicioProximoVencimientoEvent |
| **5** | Integración Frontend | 📝 Documentada | Solo documentación, sin implementación de UI |

---

## Archivos Creados

### Migraciones
- `apps/api/src/database/migrations/1773646400000-AddServiceTypes.ts`
- `apps/api/src/database/migrations/1773646500000-AddServiceTypeParts.ts`
- `apps/api/src/database/migrations/1773646600000-AddBranchRamps.ts`
- `apps/api/src/database/migrations/1773646700000-AddServiceTypeIdToAppointments.ts`
- `apps/api/src/database/migrations/1773646800000-AddServiceTypeIdToServiceOrders.ts`
- `apps/api/src/database/migrations/1773646900000-AddServiceDueNotifications.ts`

### Entidades
- `apps/api/src/modules/service-types/entities/service-type.entity.ts`
- `apps/api/src/modules/service-types/entities/service-type-part.entity.ts`
- `apps/api/src/modules/branch-ramps/entities/branch-ramp.entity.ts`
- `apps/api/src/modules/service-planning/entities/service-due-notification.entity.ts`

### DTOs
- `apps/api/src/modules/service-types/dto/create-service-type.dto.ts`
- `apps/api/src/modules/service-types/dto/update-service-type.dto.ts`
- `apps/api/src/modules/service-types/dto/add-part-to-service-type.dto.ts`
- `apps/api/src/modules/branch-ramps/dto/create-branch-ramp.dto.ts`
- `apps/api/src/modules/branch-ramps/dto/update-branch-ramp.dto.ts`
- `apps/api/src/modules/service-planning/dto/filter-vehicles-due.dto.ts`

### Módulos, Servicios, Controllers
- `apps/api/src/modules/service-types/service-types.module.ts`
- `apps/api/src/modules/service-types/service-types.service.ts`
- `apps/api/src/modules/service-types/service-types.controller.ts`
- `apps/api/src/modules/branch-ramps/branch-ramps.module.ts`
- `apps/api/src/modules/branch-ramps/branch-ramps.service.ts`
- `apps/api/src/modules/branch-ramps/branch-ramps.controller.ts`
- `apps/api/src/modules/service-planning/service-planning.module.ts`
- `apps/api/src/modules/service-planning/service-planning.service.ts`
- `apps/api/src/modules/service-planning/service-planning.controller.ts`
- `apps/api/src/modules/cron/jobs/service-due-reminders.job.ts`

---

## Archivos Modificados

### Eventos
- `apps/api/src/events/domain-events.ts` — Agregados `MantenimientoSinRefaccionesEvent` y `ServicioProximoVencimientoEvent`

### Usuarios
- `apps/api/src/modules/users/users.service.ts` — Agregado `getUsersByRoleInBranch(branchId, roles)`

### Citas
- `apps/api/src/modules/appointments/entities/appointment.entity.ts` — Agregados `serviceTypeId` y `serviceTypeRelation`
- `apps/api/src/modules/appointments/dto/create-appointment.dto.ts` — Agregado `serviceTypeId` opcional
- `apps/api/src/modules/appointments/appointments.service.ts` — Lógica serviceTypeId, duration_min, schedulable_days, checkPartsAvailability, evento mantenimiento.sin_refacciones
- `apps/api/src/modules/appointments/appointments.controller.ts` — Query param `serviceTypeId` en getAvailability
- `apps/api/src/modules/appointments/appointments.module.ts` — Import de ServiceTypesModule

### Órdenes de Servicio
- `apps/api/src/modules/service-orders/entities/service-order.entity.ts` — Agregados `serviceTypeId` y `serviceTypeRelation`
- `apps/api/src/modules/service-orders/dto/create-service-order.dto.ts` — Agregado `serviceTypeId` opcional
- `apps/api/src/modules/service-orders/service-orders.service.ts` — Copiar serviceTypeId desde appointment en create
- `apps/api/src/modules/service-orders/service-orders.module.ts` — Import de Appointment

### Disponibilidad
- `apps/api/src/modules/user-availability/user-availability.service.ts` — Parámetro `serviceTypeId`, validación `schedulable_days`, lógica de rampas ocupadas
- `apps/api/src/modules/user-availability/user-availability.controller.ts` — Query param `serviceTypeId`
- `apps/api/src/modules/user-availability/user-availability.module.ts` — TypeOrmModule ServiceType, BranchRamp

### Notificaciones
- `apps/api/src/modules/notifications/listeners/notifications.listener.ts` — Listeners `mantenimiento.sin_refacciones` y `servicio.proximo_vencimiento`
- `apps/api/src/modules/notifications/notifications.module.ts` — Import de UsersModule

### Cron
- `apps/api/src/modules/cron/cron.module.ts` — ServiceDueRemindersJob, ServicePlanningModule, entidades Branch, ServiceDueNotification

### App
- `apps/api/src/app.module.ts` — Import de ServiceTypesModule, BranchRampsModule, ServicePlanningModule

---

## Endpoints Nuevos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/service-types` | Listar tipos de servicio (query: branchId) |
| GET | `/service-types/:id` | Obtener tipo de servicio |
| GET | `/service-types/:id/parts-availability?branchId=` | Verificar disponibilidad de refacciones |
| POST | `/service-types` | Crear tipo de servicio |
| PATCH | `/service-types/:id` | Actualizar tipo de servicio |
| POST | `/service-types/:id/parts` | Agregar parte al tipo |
| DELETE | `/service-types/:id/parts/:partId` | Quitar parte del tipo |
| GET | `/branches/:branchId/ramps` | Listar rampas de sucursal |
| GET | `/branches/:branchId/ramps/:id` | Obtener rampa |
| POST | `/branches/:branchId/ramps` | Crear rampa |
| PATCH | `/branches/:branchId/ramps/:id` | Actualizar rampa |
| DELETE | `/branches/:branchId/ramps/:id` | Eliminar rampa |
| GET | `/service-planning/due?branchId=&serviceTypeId=&daysAhead=&kmAhead=` | Vehículos con servicio próximo a vencer |

---

## Fase 5: Documentación Frontend (no implementada)

Según el plan, la Fase 5 solo documenta:

1. **UI catálogo de tipos de servicio** — Duración, días programables, rampa, refacciones, recurrencia
2. **Selector de tipo de servicio al agendar** — Filtra slots por días y duración
3. **Alerta si faltan refacciones** — Opcional, informativa
4. **Pantalla de planeación de servicios** — Vehículos por vencer, lista para llamar a clientes

---

## Pendiente validación por Agente de Validación
