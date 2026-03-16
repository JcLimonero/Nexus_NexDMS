# Plan de Implementación: Agenda de Servicios Avanzada

> Documento ejecutable para el Agente de Implementación. Basado en `docs/PLAN_AGENDA_SERVICIOS_AVANZADO.md`.

**Fecha:** 2025-03-16

---

## 1. Orden de Ejecución (Fases Secuenciales)

| Fase | Nombre | Dependencias | Descripción |
|------|--------|--------------|-------------|
| **1** | Catálogo de Tipos de Servicio | Ninguna | service_types, service_type_parts, módulo service-types |
| **2** | Rampas y Slots | Fase 1 | branch_ramps, service_type_id en appointments, UserAvailabilityService con serviceTypeId/rampas/schedulable_days |
| **3** | Validación de Refacciones y Notificaciones | Fase 1, 2 | checkPartsAvailability, evento mantenimiento.sin_refacciones, getUsersByRoleInBranch |
| **4** | Servicios Recurrentes y Planeación | Fase 1, 2, 3 | service_type_id en service_orders, service_due_notifications, service-planning, ServiceDueRemindersJob, evento servicio.proximo_vencimiento |
| **5** | Integración Frontend (documentar) | Fases 1-4 | UI catálogo, selector tipo servicio, pantalla planeación |

---

## 2. Lista de Migraciones (Orden de Ejecución)

### Migración 1: AddServiceTypes
- **Timestamp:** `1773646400000`
- **Archivo:** `apps/api/src/database/migrations/1773646400000-AddServiceTypes.ts`
- **Tablas:** `service_types`

```sql
-- Crear enum service_types_category_enum
CREATE TYPE "service_types_category_enum" AS ENUM (
  'MAINTENANCE', 'REVISION', 'DIAGNOSIS', 'REPAIR', 'OTHER'
);

-- Crear tabla service_types
CREATE TABLE "service_types" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid,
  "code" varchar(50) NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" text,
  "category" "service_types_category_enum" NOT NULL,
  "duration_min" integer NOT NULL DEFAULT 60,
  "requires_ramp" boolean NOT NULL DEFAULT false,
  "ramp_duration_min" integer,
  "schedulable_days" smallint[],
  "recurrence_km_interval" integer,
  "recurrence_months_interval" integer,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_service_types" PRIMARY KEY ("id"),
  CONSTRAINT "FK_service_types_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_service_types_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL
);

-- code único por tenant: si branch_id IS NULL aplica a todas las sucursales
CREATE UNIQUE INDEX "UQ_service_types_tenant_code_global" ON "service_types" ("tenant_id", "code") WHERE "branch_id" IS NULL;
CREATE UNIQUE INDEX "UQ_service_types_tenant_branch_code" ON "service_types" ("tenant_id", "branch_id", "code") WHERE "branch_id" IS NOT NULL;
CREATE INDEX "IDX_service_types_tenant_id" ON "service_types" ("tenant_id");
CREATE INDEX "IDX_service_types_branch_id" ON "service_types" ("branch_id");
CREATE INDEX "IDX_service_types_category" ON "service_types" ("category");
```

**Nota:** Para branch_id NULL, el tipo aplica a todas las sucursales. El unique constraint debe manejarse con índices parciales o lógica en aplicación.

### Migración 2: AddServiceTypeParts
- **Timestamp:** `1773646500000`
- **Archivo:** `apps/api/src/database/migrations/1773646500000-AddServiceTypeParts.ts`
- **Tablas:** `service_type_parts`

```sql
CREATE TABLE "service_type_parts" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "service_type_id" uuid NOT NULL,
  "part_id" uuid NOT NULL,
  "quantity_required" integer NOT NULL,
  CONSTRAINT "PK_service_type_parts" PRIMARY KEY ("id"),
  CONSTRAINT "FK_service_type_parts_service_type" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_service_type_parts_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "UQ_service_type_parts_type_part" ON "service_type_parts" ("service_type_id", "part_id");
CREATE INDEX "IDX_service_type_parts_service_type_id" ON "service_type_parts" ("service_type_id");
CREATE INDEX "IDX_service_type_parts_part_id" ON "service_type_parts" ("part_id");
```

### Migración 3: AddBranchRamps
- **Timestamp:** `1773646600000`
- **Archivo:** `apps/api/src/database/migrations/1773646600000-AddBranchRamps.ts`
- **Tablas:** `branch_ramps`

```sql
CREATE TABLE "branch_ramps" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "branch_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_branch_ramps" PRIMARY KEY ("id"),
  CONSTRAINT "FK_branch_ramps_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE
);

CREATE INDEX "IDX_branch_ramps_branch_id" ON "branch_ramps" ("branch_id");
```

### Migración 4: AddServiceTypeIdToAppointments
- **Timestamp:** `1773646700000`
- **Archivo:** `apps/api/src/database/migrations/1773646700000-AddServiceTypeIdToAppointments.ts`

```sql
ALTER TABLE "appointments" ADD COLUMN "service_type_id" uuid;
ALTER TABLE "appointments" ADD CONSTRAINT "FK_appointments_service_type" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL;
CREATE INDEX "IDX_appointments_service_type_id" ON "appointments" ("service_type_id");
```

### Migración 5: AddServiceTypeIdToServiceOrders
- **Timestamp:** `1773646800000`
- **Archivo:** `apps/api/src/database/migrations/1773646800000-AddServiceTypeIdToServiceOrders.ts`

```sql
ALTER TABLE "service_orders" ADD COLUMN "service_type_id" uuid;
ALTER TABLE "service_orders" ADD CONSTRAINT "FK_service_orders_service_type" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL;
CREATE INDEX "IDX_service_orders_service_type_id" ON "service_orders" ("service_type_id");
```

### Migración 6: AddServiceDueNotifications
- **Timestamp:** `1773646900000`
- **Archivo:** `apps/api/src/database/migrations/1773646900000-AddServiceDueNotifications.ts`
- **Tablas:** `service_due_notifications`

```sql
CREATE TABLE "service_due_notifications" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "vehicle_id" uuid NOT NULL,
  "service_type_id" uuid NOT NULL,
  "notified_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_service_due_notifications" PRIMARY KEY ("id"),
  CONSTRAINT "FK_service_due_notifications_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "customer_vehicles"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_service_due_notifications_service_type" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE CASCADE
);

CREATE INDEX "IDX_service_due_notifications_vehicle_type" ON "service_due_notifications" ("vehicle_id", "service_type_id");
CREATE INDEX "IDX_service_due_notifications_notified_at" ON "service_due_notifications" ("notified_at");
```

**Nota:** No usar UNIQUE en (vehicle_id, service_type_id). Permitir múltiples registros para historial. La lógica "no notificar en los últimos 14 días" se implementa consultando `MAX(notified_at)` por vehicle_id + service_type_id en el ServiceDueRemindersJob.

---

## 3. Archivos a Crear

### Entidades

| Archivo | Descripción |
|---------|-------------|
| `apps/api/src/modules/service-types/entities/service-type.entity.ts` | Entidad ServiceType con category enum, duration_min, requires_ramp, ramp_duration_min, schedulable_days (smallint[]), recurrence_km_interval, recurrence_months_interval |
| `apps/api/src/modules/service-types/entities/service-type-part.entity.ts` | Entidad ServiceTypePart (service_type_id, part_id, quantity_required) |
| `apps/api/src/modules/branch-ramps/entities/branch-ramp.entity.ts` | Entidad BranchRamp (branch_id, name, is_active) |
| `apps/api/src/modules/service-planning/entities/service-due-notification.entity.ts` | Entidad ServiceDueNotification (vehicle_id, service_type_id, notified_at) |

### DTOs

| Archivo | Descripción |
|---------|-------------|
| `apps/api/src/modules/service-types/dto/create-service-type.dto.ts` | code, name, description?, category, duration_min?, requires_ramp?, ramp_duration_min?, schedulable_days?, recurrence_km_interval?, recurrence_months_interval?, branch_id? |
| `apps/api/src/modules/service-types/dto/update-service-type.dto.ts` | PartialType(CreateServiceTypeDto) |
| `apps/api/src/modules/service-types/dto/add-part-to-service-type.dto.ts` | part_id, quantity_required |
| `apps/api/src/modules/branch-ramps/dto/create-branch-ramp.dto.ts` | name |
| `apps/api/src/modules/branch-ramps/dto/update-branch-ramp.dto.ts` | name?, is_active? |
| `apps/api/src/modules/service-planning/dto/filter-vehicles-due.dto.ts` | branchId, serviceTypeId?, daysAhead?, kmAhead? (query params) |

### Módulos, Servicios, Controllers

| Archivo | Descripción |
|---------|-------------|
| `apps/api/src/modules/service-types/service-types.module.ts` | Módulo con ServiceType, ServiceTypePart, ServiceTypesService, ServiceTypesController |
| `apps/api/src/modules/service-types/service-types.service.ts` | findAll, findOne, create, update, getRequiredParts, checkPartsAvailability |
| `apps/api/src/modules/service-types/service-types.controller.ts` | CRUD + GET /service-types/:id/parts-availability?branchId= |
| `apps/api/src/modules/branch-ramps/branch-ramps.module.ts` | Módulo con BranchRamp, BranchRampsService |
| `apps/api/src/modules/branch-ramps/branch-ramps.service.ts` | CRUD por branchId |
| `apps/api/src/modules/branch-ramps/branch-ramps.controller.ts` | GET/POST/PATCH/DELETE /branches/:branchId/ramps (o /branch-ramps con branchId) |
| `apps/api/src/modules/service-planning/service-planning.module.ts` | Módulo con ServicePlanningService, ServicePlanningController |
| `apps/api/src/modules/service-planning/service-planning.service.ts` | getVehiclesDueForService(branchId, serviceTypeId?, daysAhead?, kmAhead?) |
| `apps/api/src/modules/service-planning/service-planning.controller.ts` | GET /service-planning/due?branchId=&serviceTypeId=&daysAhead=&kmAhead= |
| `apps/api/src/modules/cron/jobs/service-due-reminders.job.ts` | Cron diario 8:00 AM, emite servicio.proximo_vencimiento, registra en service_due_notifications |

### Eventos de Dominio

| Archivo | Cambio |
|---------|--------|
| `apps/api/src/events/domain-events.ts` | Agregar `MantenimientoSinRefaccionesEvent` y `ServicioProximoVencimientoEvent` |

---

## 4. Archivos a Modificar

### 4.1 Domain Events

**Archivo:** `apps/api/src/events/domain-events.ts`

**Agregar al final:**

```ts
export class MantenimientoSinRefaccionesEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly serviceTypeName: string,
    public readonly scheduledAt: Date,
    public readonly missingParts: Array<{
      partId: string;
      partName: string;
      required: number;
      available: number;
    }>,
  ) {}
}

export class ServicioProximoVencimientoEvent {
  constructor(
    public readonly vehicleId: string,
    public readonly clientId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly serviceTypeName: string,
    public readonly nextDueDate: Date | null,
    public readonly nextDueKm: number | null,
    public readonly client: { email?: string; phone?: string; name?: string },
    public readonly vehicle: { make: string; model: string; year: number; plate?: string },
  ) {}
}
```

### 4.2 UsersService

**Archivo:** `apps/api/src/modules/users/users.service.ts`

**Agregar método:**

```ts
async getUsersByRoleInBranch(
  branchId: string,
  roles: RoleEnum[],
): Promise<User[]> {
  const users = await this.userRepo
    .createQueryBuilder('u')
    .innerJoinAndSelect('u.roles', 'ur')
    .innerJoin(UserBranch, 'ub', 'ub.user_id = u.id')
    .where('ub.branch_id = :branchId', { branchId })
    .andWhere('ur.role IN (:...roles)', { roles })
    .andWhere('u.deleted_at IS NULL')
    .andWhere('u.is_active = :isActive', { isActive: true })
    .select(['u.id', 'u.email', 'u.firstName', 'u.lastName'])
    .getMany();
  return users;
}
```

**Importar:** `UserBranch` de legal-entities, `RoleEnum` de user.entity.

### 4.3 NotificationsListener

**Archivo:** `apps/api/src/modules/notifications/listeners/notifications.listener.ts`

**Agregar imports:**
```ts
import { MantenimientoSinRefaccionesEvent, ServicioProximoVencimientoEvent } from '../../../events/domain-events';
```

**Agregar listeners:**

```ts
@OnEvent('mantenimiento.sin_refacciones')
async onMantenimientoSinRefacciones(event: MantenimientoSinRefaccionesEvent): Promise<void> {
  // Obtener emails de PARTS_MANAGER y MANAGER/AFTERSALES_MANAGER del branch
  // Usar UsersService.getUsersByRoleInBranch(branchId, [PARTS_MANAGER, MANAGER, AFTERSALES_MANAGER])
  // Enviar email a cada uno (o lista única) con detalle de partes faltantes
  // Encolar en notificationsQueue con templateKey 'mantenimiento_sin_refacciones'
}

@OnEvent('servicio.proximo_vencimiento')
async onServicioProximoVencimiento(event: ServicioProximoVencimientoEvent): Promise<void> {
  // Similar a cita.recordatorio: WhatsApp (prioridad) o email, templateKey 'servicio_proximo_vencimiento'
  // templateParams: { name, vehicleMake, vehicleModel, serviceTypeName }
}
```

**Nota:** Para `mantenimiento.sin_refacciones` el NotificationsListener necesita inyectar `UsersService`. Verificar si UsersModule exporta UsersService; si no, crear un módulo compartido o inyectar UsersModule en NotificationsModule.

### 4.4 UserAvailabilityService

**Archivo:** `apps/api/src/modules/user-availability/user-availability.service.ts`

**Cambios:**

1. Agregar parámetro opcional `serviceTypeId?: string` a `getAvailableSlots(branchId, date, mechanicId?, durationMin?, serviceTypeId?)`.

2. Si `serviceTypeId` se pasa:
   - Cargar ServiceType (service-types module).
   - Si `schedulable_days` está definido y no vacío: si `dayOfWeek` (0-6) no está en `schedulable_days`, retornar `[]`.
   - Usar `duration_min` del ServiceType en lugar de `durationMin` param.
   - Si `requires_ramp`: inyectar BranchRamp repo, contar rampas del branch; para cada cita existente con `requires_ramp` (join con ServiceType o campo en appointment), calcular ventana ocupada `ramp_duration_min` desde `scheduled_at`; un slot es válido si hay mecánico libre Y (no requiere rampa O hay rampa libre en ese slot).

3. Para citas con `service_type_id`: cargar ServiceType y usar `requires_ramp`, `ramp_duration_min` y `duration_min` de la relación. Si la cita no tiene `service_type_id`, asumir `requires_ramp=false` y `duration_min` del appointment.

### 4.5 UserAvailabilityController

**Archivo:** `apps/api/src/modules/user-availability/user-availability.controller.ts`

**Cambios:**

- Agregar query param `serviceTypeId` a `getAvailableSlots`:
```ts
@Query('serviceTypeId') serviceTypeId?: string,
```
- Pasar `serviceTypeId` al servicio.

### 4.6 UserAvailabilityModule

**Archivo:** `apps/api/src/modules/user-availability/user-availability.module.ts`

**Cambios:**

- Importar `ServiceTypesModule` (o TypeOrmModule.forFeature([ServiceType, BranchRamp])).
- Agregar `ServiceType` y `BranchRamp` a TypeOrmModule.forFeature si no se usa ServiceTypesModule.

### 4.7 AppointmentsService

**Archivo:** `apps/api/src/modules/appointments/appointments.service.ts`

**Cambios en `create`:**

1. Agregar `serviceTypeId?: string` al DTO y mapear a la entidad.
2. Si `serviceTypeId` existe: cargar ServiceType, usar `duration_min` y validar que `scheduledAt` esté en `schedulable_days` (si definido).
3. Si `serviceTypeId` y categoría es MAINTENANCE: llamar `ServiceTypesService.checkPartsAvailability(serviceTypeId, branchId)`.
4. Si hay partes faltantes: emitir `mantenimiento.sin_refacciones` con `EventEmitter2.emit('mantenimiento.sin_refacciones', new MantenimientoSinRefaccionesEvent(...))`.
5. No bloquear la creación de la cita (el negocio puede agendar igual).
6. Persistir `serviceTypeId` en el appointment.

### 4.8 CreateAppointmentDto

**Archivo:** `apps/api/src/modules/appointments/dto/create-appointment.dto.ts`

**Cambios:**

- Agregar `@IsOptional() @IsUUID() serviceTypeId?: string;`
- Mantener `serviceType` como string (retrocompatibilidad cuando no hay serviceTypeId).

### 4.9 Appointment Entity

**Archivo:** `apps/api/src/modules/appointments/entities/appointment.entity.ts`

**Cambios:**

- Agregar `@Column({ name: 'service_type_id', type: 'uuid', nullable: true }) serviceTypeId: string | null;`
- Agregar `@ManyToOne(() => ServiceType) @JoinColumn({ name: 'service_type_id' }) serviceTypeRelation?: ServiceType;`

### 4.10 ServiceOrdersService

**Archivo:** `apps/api/src/modules/service-orders/service-orders.service.ts`

**Cambios en `create`:**

1. Agregar `serviceTypeId?: string` al CreateServiceOrderDto.
2. Si `dto.appointmentId` existe: cargar Appointment, si tiene `serviceTypeId` copiarlo a la OS.
3. Si no viene de cita pero `dto.serviceTypeId` existe: usarlo.
4. Persistir `serviceTypeId` en la entidad ServiceOrder al crear.

**Cambios en `deliver` (o método que cambia status a DELIVERED):**

- Asegurar que `service_type_id` se persiste (ya está en la entidad desde create).

### 4.11 CreateServiceOrderDto

**Archivo:** `apps/api/src/modules/service-orders/dto/create-service-order.dto.ts`

**Cambios:**

- Agregar `@IsOptional() @IsUUID() serviceTypeId?: string;`

### 4.12 ServiceOrder Entity

**Archivo:** `apps/api/src/modules/service-orders/entities/service-order.entity.ts`

**Cambios:**

- Agregar `@Column({ name: 'service_type_id', type: 'uuid', nullable: true }) serviceTypeId: string | null;`
- Agregar `@ManyToOne(() => ServiceType) @JoinColumn({ name: 'service_type_id' }) serviceTypeRelation?: ServiceType;`

### 4.13 CronModule

**Archivo:** `apps/api/src/modules/cron/cron.module.ts`

**Cambios:**

- Importar TypeOrmModule.forFeature([ServiceType, ServiceOrder, CustomerVehicle, ServiceDueNotification, Client, ...]).
- Agregar provider `ServiceDueRemindersJob`.

### 4.14 AppModule

**Archivo:** `apps/api/src/app.module.ts`

**Cambios:**

- Importar `ServiceTypesModule`, `BranchRampsModule`, `ServicePlanningModule` (crear estos módulos).

### 4.15 BranchesModule o BranchRampsModule

**Decisión:** Crear `BranchRampsModule` independiente con ruta `/branches/:branchId/ramps` o sub-ruta dentro de BranchesController. Recomendación: módulo `branch-ramps` con controller que recibe `branchId` como param.

### 4.16 NotificationsModule

**Archivo:** `apps/api/src/modules/notifications/notifications.module.ts`

**Cambios:**

- Importar `UsersModule` para usar `UsersService.getUsersByRoleInBranch` en el listener de mantenimiento.sin_refacciones.

---

## 5. Recomendaciones Técnicas

### 5.1 Priorizar MVP

| Incluir en MVP | Dejar para después |
|----------------|-------------------|
| service_types, service_type_parts, branch_ramps | Rampa explícita por cita (ramp_id en appointments) |
| service_type_id en appointments y service_orders | Búsqueda de stock a nivel grupo (legal_entity) |
| UserAvailabilityService con serviceTypeId, rampas, schedulable_days | checkPartsAvailability en consulta de slots (checkPartsAvailability flag) |
| Validación refacciones al crear cita, evento mantenimiento.sin_refacciones | |
| getUsersByRoleInBranch | |
| ServicePlanningService, GET /service-planning/due | |
| ServiceDueRemindersJob, evento servicio.proximo_vencimiento | |
| service_due_notifications para evitar spam | |

### 5.2 Consideraciones de Stock

- Las partes tienen `branch_id` y `stock_quantity`. `checkPartsAvailability` debe verificar por branch.
- Si `service_type_parts` referencia a `parts` que pueden tener múltiples branches (cada parte tiene un branch_id), la consulta debe buscar partes con `branch_id = branchId` del servicio O considerar si hay transferencias entre sucursales. Para MVP: partes con `branch_id = branchId` del branch de la cita.

### 5.3 Unique Constraint service_types

- `code` debe ser único por tenant. Si `branch_id` es null, el tipo aplica a todas las sucursales. El unique puede ser `(tenant_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'), code)` o usar un índice parcial. Para simplificar: `UNIQUE(tenant_id, branch_id, code)` con `branch_id` permitiendo NULL; en PostgreSQL, NULL en unique puede dar múltiples filas. Mejor: `UNIQUE(tenant_id, code)` cuando branch_id IS NULL, y `UNIQUE(tenant_id, branch_id, code)` cuando branch_id IS NOT NULL. Implementar con dos índices parciales.

### 5.4 service_due_notifications

- Para evitar spam: antes de emitir `servicio.proximo_vencimiento`, verificar que no exista registro en `service_due_notifications` para (vehicle_id, service_type_id) con `notified_at` en los últimos 14 días.
- Si se notifica: insertar registro en `service_due_notifications` (vehicle_id, service_type_id, notified_at).
- El unique `(vehicle_id, service_type_id)` puede impedir múltiples registros. Mejor: permitir múltiples registros y consultar `MAX(notified_at) WHERE vehicle_id = X AND service_type_id = Y` para decidir si notificar.

---

## 6. Checklist por Fase

### Fase 1: Catálogo de Tipos de Servicio

- [ ] Migración `1773646400000-AddServiceTypes.ts` (tabla service_types)
- [ ] Migración `1773646500000-AddServiceTypeParts.ts` (tabla service_type_parts)
- [ ] Entidad `ServiceType` (service-type.entity.ts)
- [ ] Entidad `ServiceTypePart` (service-type-part.entity.ts)
- [ ] DTOs: CreateServiceTypeDto, UpdateServiceTypeDto, AddPartToServiceTypeDto
- [ ] ServiceTypesService: findAll(tenantId, branchId?), findOne(id), create(dto), update(id, dto), getRequiredParts(serviceTypeId), checkPartsAvailability(serviceTypeId, branchId)
- [ ] ServiceTypesController: CRUD + GET /service-types/:id/parts-availability?branchId=
- [ ] ServiceTypesModule
- [ ] Registrar ServiceTypesModule en AppModule

### Fase 2: Rampas y Slots

- [ ] Migración `1773646600000-AddBranchRamps.ts` (tabla branch_ramps)
- [ ] Migración `1773646700000-AddServiceTypeIdToAppointments.ts`
- [ ] Entidad `BranchRamp` (branch-ramp.entity.ts)
- [ ] DTOs: CreateBranchRampDto, UpdateBranchRampDto
- [ ] BranchRampsService: CRUD por branch
- [ ] BranchRampsController: GET/POST/PATCH/DELETE /branches/:branchId/ramps
- [ ] BranchRampsModule
- [ ] Modificar Appointment entity: agregar serviceTypeId
- [ ] Modificar UserAvailabilityService: parámetro serviceTypeId, lógica schedulable_days, rampas
- [ ] Modificar UserAvailabilityController: query param serviceTypeId
- [ ] Modificar UserAvailabilityModule: importar ServiceType, BranchRamp
- [ ] Registrar BranchRampsModule en AppModule

### Fase 3: Validación de Refacciones y Notificaciones

- [ ] ServiceTypesService.checkPartsAvailability: implementar (service_type_parts + Part.stockQuantity por branch)
- [ ] Agregar MantenimientoSinRefaccionesEvent en domain-events.ts
- [ ] UsersService.getUsersByRoleInBranch(branchId, roles: RoleEnum[])
- [ ] NotificationsListener: @OnEvent('mantenimiento.sin_refacciones') — obtener PARTS_MANAGER, MANAGER, AFTERSALES_MANAGER, enviar email
- [ ] NotificationsModule: importar UsersModule
- [ ] AppointmentsService.create: si serviceTypeId y MAINTENANCE, checkPartsAvailability, emitir evento si faltan
- [ ] CreateAppointmentDto: agregar serviceTypeId
- [ ] AppointmentsService.create: persistir serviceTypeId, usar duration_min del ServiceType

### Fase 4: Servicios Recurrentes y Planeación

- [ ] Migración `1773646800000-AddServiceTypeIdToServiceOrders.ts`
- [ ] Migración `1773646900000-AddServiceDueNotifications.ts`
- [ ] Entidad ServiceDueNotification
- [ ] Modificar ServiceOrder entity: agregar serviceTypeId
- [ ] Modificar CreateServiceOrderDto: agregar serviceTypeId
- [ ] ServiceOrdersService.create: copiar serviceTypeId desde appointment si appointmentId existe
- [ ] ServicePlanningService: getVehiclesDueForService(branchId, serviceTypeId?, daysAhead?, kmAhead?)
- [ ] Lógica: última OS con service_type_id DELIVERED → last_km, last_date → next_due_km, next_due_date
- [ ] ServicePlanningController: GET /service-planning/due
- [ ] ServicePlanningModule
- [ ] Agregar ServicioProximoVencimientoEvent en domain-events.ts
- [ ] ServiceDueRemindersJob: cron diario 8:00 AM, obtener vehículos due, verificar service_due_notifications (14 días), emitir evento, registrar notificación
- [ ] NotificationsListener: @OnEvent('servicio.proximo_vencimiento') — WhatsApp/email al cliente
- [ ] CronModule: agregar ServiceDueRemindersJob, TypeOrmModule para entidades necesarias
- [ ] Registrar ServicePlanningModule en AppModule

### Fase 5: Integración Frontend (documentar)

- [ ] Documentar: UI catálogo de tipos de servicio (duración, días, rampa, refacciones, recurrencia)
- [ ] Documentar: selector de tipo de servicio al agendar → filtra slots por días y duración
- [ ] Documentar: alerta si faltan refacciones (opcional, informativa)
- [ ] Documentar: pantalla de planeación de servicios (vehículos por vencer, lista para llamar a clientes)

---

## 7. Dependencias entre Módulos

```
ServiceTypesModule
  └── PartsModule (para checkPartsAvailability)

BranchRampsModule
  └── (sin deps)

UserAvailabilityModule
  └── ServiceTypesModule (o TypeOrmModule ServiceType, BranchRamp)

AppointmentsModule
  └── ServiceTypesModule (para checkPartsAvailability, EventEmitter2)

ServiceOrdersModule
  └── (ya tiene AppointmentsModule para appointmentId)

NotificationsModule
  └── UsersModule (para getUsersByRoleInBranch)

ServicePlanningModule
  └── ServiceTypesModule, ServiceOrdersModule (o repos directos), CustomerVehiclesModule

CronModule
  └── ServicePlanningService (o lógica inline en ServiceDueRemindersJob), EventEmitter2
```

---

## 8. Templates de Notificación

Para los listeners, se necesitarán templates (o keys) en el sistema de notificaciones:

| Template Key | Evento | Uso |
|--------------|--------|-----|
| `mantenimiento_sin_refacciones` | mantenimiento.sin_refacciones | Email a gerentes con lista de partes faltantes |
| `servicio_proximo_vencimiento` | servicio.proximo_vencimiento | WhatsApp/email al cliente invitando a agendar |

---

*Documento listo para ejecución por el Agente de Implementación.*
