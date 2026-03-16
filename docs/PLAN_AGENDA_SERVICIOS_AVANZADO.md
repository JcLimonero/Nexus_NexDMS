# Plan: Agenda de Servicios Avanzada

> Considera: duración por tipo de servicio, rampas del taller, días agendables configurables, disponibilidad de refacciones, notificación a gerentes, **servicios recurrentes por km/tiempo**, **planeación de servicios** y **llamada a clientes** cuando les toca servicio.

**Fecha:** 2025-03-16

---

## 1. Resumen de Requerimientos

| Requerimiento | Descripción |
|---------------|-------------|
| **Duración por tipo de servicio** | Cada tipo de servicio tiene su duración estimada (minutos) |
| **Uso de rampas** | Algunos servicios requieren rampa; la rampa queda ocupada un tiempo definido |
| **Días agendables** | Mantenimiento: fines de semana (configurable). Revisión: solo entre semana (configurable) |
| **Refacciones en mantenimiento** | Los servicios de mantenimiento llevan refacciones; validar stock antes de agendar |
| **Notificación por falta de refacciones** | Si faltan refacciones: enviar correo al gerente de refacciones y al gerente de taller |
| **Servicios recurrentes** | Cada N km o cada N meses (ej: cambio de aceite cada 10,000 km o 6 meses) |
| **Planeación de servicios** | Listado de vehículos con servicio próximo a vencer (por km o por fecha) |
| **Llamada a clientes** | Notificar/llamar a clientes cuando les toca servicio (cron job + WhatsApp/email) |

---

## 2. Modelo de Datos Propuesto

### 2.1 Catálogo de Tipos de Servicio (`service_types`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK tenants |
| branch_id | uuid | FK branches (null = aplica a todas las sucursales del tenant) |
| code | varchar(50) | Código único por tenant (ej: MANT-001, REV-001) |
| name | varchar(200) | Nombre (ej: "Cambio de aceite", "Revisión pre-venta") |
| description | text | Descripción opcional |
| category | enum | MAINTENANCE, REVISION, DIAGNOSIS, REPAIR, OTHER |
| duration_min | int | Duración estimada en minutos (default 60) |
| requires_ramp | boolean | Si requiere rampa (default false) |
| ramp_duration_min | int | Minutos que la rampa queda ocupada (null si no requiere) |
| schedulable_days | smallint[] | Días agendables: [1,2,3,4,5] = lun-vie, [0,6] = fin de semana, [0-6] = todos |
| recurrence_km_interval | int | Cada cuántos km se repite (null = no recurrente por km) |
| recurrence_months_interval | int | Cada cuántos meses se repite (null = no recurrente por tiempo) |
| is_active | boolean | default true |

**Nota:** `schedulable_days` usa 0=Dom, 1=Lun, ..., 6=Sab. Vacío = todos los días.

**Recurrencia:** Si ambos están definidos, el servicio vence cuando se cumpla **cualquiera** de los dos (km O tiempo). Ej: cambio de aceite cada 10,000 km o 6 meses, lo que ocurra primero.

### 2.2 Refacciones Requeridas por Tipo de Servicio (`service_type_parts`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| service_type_id | uuid | FK service_types |
| part_id | uuid | FK parts |
| quantity_required | int | Cantidad necesaria |

### 2.3 Rampas del Taller (`branch_ramps`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| branch_id | uuid | FK branches |
| name | varchar(100) | Ej: "Rampa 1", "Elevador A" |
| is_active | boolean | default true |

### 2.4 Relación Appointment ↔ Service Type

- Agregar `service_type_id` (uuid, nullable) a `appointments`.
- Si existe, se usa su `duration_min`, `requires_ramp`, `ramp_duration_min` y `schedulable_days`.
- Si no existe, se mantiene `service_type` (varchar) y `duration_min` actuales para retrocompatibilidad.

### 2.5 Relación Service Order ↔ Service Type (para recurrencia)

- Agregar `service_type_id` (uuid, nullable) a `service_orders`.
- Al entregar una OS (status DELIVERED), se usa `km_out` y `delivered_at` como referencia para calcular la próxima vez que vence ese servicio.
- Si la OS proviene de una cita con `service_type_id`, copiarlo; si no, permitir asignarlo manualmente.

### 2.6 Asignación de Rampa a Cita (opcional, fase 2)

- Opción A: No asignar rampa explícita; solo contar rampas ocupadas por citas que `requires_ramp` en el rango de tiempo.
- Opción B: Agregar `ramp_id` a appointments para asignación explícita.

**Recomendación:** Opción A para MVP. Las rampas son un recurso compartido; si hay N rampas y M citas que requieren rampa en el mismo slot, se valida que M ≤ N.

---

## 3. Flujo de Disponibilidad de Slots (Actualizado)

```
GET /user-availability/slots?branchId=&date=&serviceTypeId=&mechanicId=
```

1. **Obtener service type** (si `serviceTypeId`):
   - `duration_min` → duración del slot
   - `schedulable_days` → filtrar: si `date` no está en `schedulable_days`, retornar []
   - `requires_ramp`, `ramp_duration_min` → para validar rampas

2. **Obtener mecánicos** (igual que ahora, por user_branches + rol MECHANIC)

3. **Obtener rampas** del branch (si algún servicio del día requiere rampa)

4. **Generar slots** considerando:
   - Horarios de mecánicos (UserSchedule)
   - Ausencias (UserAbsence)
   - Citas existentes (Appointment) — mecánico ocupado
   - **Rampas ocupadas** — si el servicio requiere rampa, verificar que haya rampa libre en ese slot
     - Para cada cita existente con `requires_ramp`, ocupar una rampa durante `ramp_duration_min` desde `scheduled_at`
     - Un slot es válido si: hay mecánico libre Y (no requiere rampa O hay rampa libre)

5. **Retornar slots** con `start`, `end`, `mechanicId`

---

## 4. Validación de Refacciones al Agendar Mantenimiento

### 4.1 Momento de validación

- Al crear una cita (`POST /appointments`) con `serviceTypeId` de categoría MAINTENANCE.
- Opcional: al consultar slots, incluir flag `checkPartsAvailability` para filtrar slots cuando ya se sabe que faltan refacciones (evitar agendar y luego fallar).

### 4.2 Lógica

1. Obtener `service_type_parts` del `serviceTypeId`.
2. Para cada parte: verificar `Part.stockQuantity >= quantity_required` en la sucursal (branch).
3. Si alguna parte no tiene stock suficiente:
   - **No bloquear** la creación de la cita (el negocio puede decidir agendar igual y surtir después).
   - **Emitir evento** `mantenimiento.sin_refacciones`.
   - **Enviar correo** a:
     - Usuarios con rol `PARTS_MANAGER` asignados al branch (user_branches).
     - Usuarios con rol `MANAGER` o `AFTERSALES_MANAGER` asignados al branch (gerente de taller).

### 4.3 Evento de dominio

```ts
// events/domain-events.ts
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
```

### 4.4 Listener de notificaciones

- `@OnEvent('mantenimiento.sin_refacciones')`
- Obtener usuarios con PARTS_MANAGER y (MANAGER o AFTERSALES_MANAGER) en el branch.
- Enviar email a cada uno (o a lista única sin duplicados) con detalle de partes faltantes.

---

## 5. Servicios Recurrentes, Planeación y Llamada a Clientes

### 5.1 Cálculo de "próximo servicio debido"

Para cada combinación **vehículo + tipo de servicio recurrente**:

1. Obtener la última OS con `service_type_id` = X y `status` = DELIVERED para ese vehículo.
2. Si existe: `last_km = km_out`, `last_date = delivered_at`.
3. Si no existe: usar `customer_vehicles.mileage` actual y fecha de hoy como referencia inicial (o no mostrar como "debido" hasta que haya al menos un servicio previo).
4. Calcular:
   - `next_due_km = last_km + recurrence_km_interval` (si el tipo tiene recurrence_km_interval)
   - `next_due_date = last_date + recurrence_months_interval` meses (si tiene recurrence_months_interval)
5. El servicio **está debido** si:
   - Por km: `vehicle.mileage >= next_due_km`
   - Por tiempo: `hoy >= next_due_date`
   - Si ambos intervalos existen: vence cuando se cumpla **cualquiera** de los dos.

### 5.2 Endpoint: Vehículos con servicio próximo a vencer

```
GET /service-planning/due?branchId=&serviceTypeId=&daysAhead=&kmAhead=
```

- `daysAhead`: incluir vehículos que vencen en los próximos N días (por tiempo).
- `kmAhead`: incluir vehículos que vencen en los próximos N km (por kilometraje).
- Retorna: lista de `{ vehicleId, vehicle, owner, serviceType, lastServiceDate, lastKm, nextDueDate, nextDueKm, isOverdue }`.

**Uso:** Pantalla de planeación para el taller / ventas. Ver qué clientes hay que contactar.

### 5.3 Cron job: Llamada a clientes (servicio debido)

- **Frecuencia:** Diario (ej: 8:00 AM).
- **Lógica:**
  1. Obtener vehículos con servicio debido (por km o por tiempo) en los próximos X días (configurable, ej: 7 días).
  2. Para cada vehículo: obtener owner (client) y contacto preferido (phone, email).
  3. Emitir evento `servicio.proximo_vencimiento` o encolar notificación directa.
  4. **Canal:** WhatsApp (prioridad) o email, similar a `cita.recordatorio` y `stock.minimo`.

- **Evento de dominio:**

```ts
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

- **NotificationsListener:** `@OnEvent('servicio.proximo_vencimiento')` → enviar WhatsApp/email al cliente invitándolo a agendar.

### 5.4 Evitar spam

- **Última notificación:** Registrar en `notification_logs` o tabla `service_due_notifications` (vehicle_id, service_type_id, notified_at) para no enviar el mismo aviso repetido.
- **Ventana:** Solo notificar si no se ha notificado en los últimos N días (ej: 14 días) para el mismo vehículo + tipo de servicio.
- **Opción:** Permitir al cliente optar por no recibir recordatorios (campo en client o preference).

### 5.5 Flujo resumido

```
Service Type (recurrence_km=10000, recurrence_months=6)
    ↓
Service Order entregada (km_out=50000, delivered_at=2025-01-15)
    ↓
Próximo: 60,000 km O 2025-07-15 (lo que ocurra primero)
    ↓
Vehicle.mileage = 59,200 → aún no por km
Hoy = 2025-03-16 → aún no por tiempo
    ↓
En 7 días (2025-03-23): si mileage llega a 59,500+ o falta poco para 60k → incluir en "due"
    ↓
Cron job: detecta vehículos due en ventana → notifica a cliente
```

---

## 6. Migraciones (orden sugerido)

| # | Timestamp | Nombre | Tablas |
|---|----------|--------|--------|
| 1 | 1773646400000 | AddServiceTypes | service_types (incl. recurrence_km_interval, recurrence_months_interval) |
| 2 | 1773646500000 | AddServiceTypeParts | service_type_parts |
| 3 | 1773646600000 | AddBranchRamps | branch_ramps |
| 4 | 1773646700000 | AddServiceTypeIdToAppointments | ALTER appointments ADD service_type_id |
| 5 | 1773646800000 | AddServiceTypeIdToServiceOrders | ALTER service_orders ADD service_type_id |
| 6 | 1773646900000 | AddServiceDueNotifications | service_due_notifications (vehicle_id, service_type_id, notified_at) para evitar spam |

---

## 7. Cambios en Módulos Existentes

### 7.1 Nuevo módulo: `service-types`

- **Entidades:** ServiceType, ServiceTypePart
- **Servicio:** ServiceTypesService
  - `findAll(tenantId, branchId?)`
  - `findOne(id)`
  - `create(dto)`, `update(id, dto)`
  - `getRequiredParts(serviceTypeId)`
  - `checkPartsAvailability(serviceTypeId, branchId): { ok: boolean; missing: [...] }`
- **Controller:** CRUD + `GET /service-types/:id/parts-availability?branchId=`

### 7.2 Nuevo módulo: `branch-ramps` (o dentro de branches)

- **Entidad:** BranchRamp
- **Servicio:** BranchRampsService (CRUD)
- **Controller:** `GET/POST/PATCH/DELETE /branches/:branchId/ramps`

### 7.3 Nuevo módulo: `service-planning`

- **Servicio:** ServicePlanningService
  - `getVehiclesDueForService(branchId, serviceTypeId?, daysAhead?, kmAhead?): VehicleDue[]`
- **Controller:** `GET /service-planning/due?branchId=&serviceTypeId=&daysAhead=&kmAhead=`
- **Uso:** Pantalla de planeación, integración con cron de notificaciones.

### 7.4 Nuevo cron job: `ServiceDueRemindersJob`

- Ejecutar diario (ej: 8:00 AM).
- Obtener vehículos con servicio debido en ventana (ej: próximos 7 días).
- Para cada uno: verificar que no se haya notificado recientemente (`service_due_notifications`).
- Emitir `servicio.proximo_vencimiento` → NotificationsListener envía WhatsApp/email.
- Registrar en `service_due_notifications` para evitar spam.

### 7.6 Modificar: `user-availability`

- **UserAvailabilityService.getAvailableSlots**:
  - Parámetro opcional `serviceTypeId?: string`
  - Si se pasa: cargar ServiceType, usar `duration_min`, validar `schedulable_days`, considerar rampas
  - Consultar `branch_ramps` y citas con `requires_ramp` para calcular rampas ocupadas

### 7.7 Modificar: `appointments`

- **CreateAppointmentDto:** agregar `serviceTypeId?: string`
- **AppointmentsService.create:**
  - Si `serviceTypeId` y el tipo es MAINTENANCE: llamar `checkPartsAvailability`
  - Si hay partes faltantes: emitir `mantenimiento.sin_refacciones` y enviar correos (vía listener)
  - Usar `duration_min` del service type si existe
  - Validar que la fecha esté en `schedulable_days` del service type

### 7.8 Modificar: `service-orders`

- Agregar `service_type_id` a CreateServiceOrderDto (opcional).
- Al crear OS desde cita: copiar `service_type_id` del appointment si existe.
- Al cambiar status a DELIVERED: persistir `service_type_id` para cálculo de recurrencia.

### 7.9 Modificar: `notifications`

- **NotificationsListener:** agregar `@OnEvent('mantenimiento.sin_refacciones')`
  - Obtener emails de PARTS_MANAGER y MANAGER/AFTERSALES_MANAGER del branch
  - Encolar envío de email con detalle de partes faltantes
- **NotificationsListener:** agregar `@OnEvent('servicio.proximo_vencimiento')`
  - Enviar WhatsApp (prioridad) o email al cliente con mensaje tipo: "Le toca servicio de [tipo] para su [vehículo]. Agende su cita."

---

## 8. Servicio para Obtener Usuarios por Rol en Branch

Se necesita un método reutilizable:

```ts
// UsersService o nuevo BranchManagersService
async getUsersByRoleInBranch(
  branchId: string,
  roles: RoleEnum[],
): Promise<User[]>
```

- Join: users + user_branches (branch_id) + user_roles (role IN roles)
- Retorna usuarios con email para notificaciones.

---

## 9. Checklist de Implementación

### Fase 1: Catálogo de Tipos de Servicio

- [ ] Migración AddServiceTypes (incl. recurrence_km_interval, recurrence_months_interval)
- [ ] Migración AddServiceTypeParts
- [ ] Entidades ServiceType, ServiceTypePart
- [ ] Módulo service-types con CRUD
- [ ] Endpoint GET /service-types/:id/parts-availability?branchId=

### Fase 2: Rampas y Slots

- [ ] Migración AddBranchRamps
- [ ] Entidad BranchRamp
- [ ] CRUD de rampas por branch
- [ ] Migración AddServiceTypeIdToAppointments
- [ ] UserAvailabilityService: parámetro serviceTypeId, lógica de rampas y schedulable_days

### Fase 3: Validación de Refacciones y Notificaciones

- [ ] ServiceTypesService.checkPartsAvailability
- [ ] Evento MantenimientoSinRefaccionesEvent
- [ ] NotificationsListener para mantenimiento.sin_refacciones
- [ ] UsersService.getUsersByRoleInBranch (o equivalente)
- [ ] AppointmentsService.create: validar partes, emitir evento si faltan

### Fase 4: Servicios Recurrentes y Planeación

- [ ] Migración AddServiceTypeIdToServiceOrders
- [ ] Migración AddServiceDueNotifications
- [ ] ServiceTypesService: campos recurrence_km_interval, recurrence_months_interval
- [ ] ServicePlanningService: getVehiclesDueForService
- [ ] Endpoint GET /service-planning/due
- [ ] ServiceOrdersService: copiar service_type_id desde appointment, persistir en DELIVERED
- [ ] ServiceDueRemindersJob (cron diario)
- [ ] Evento ServicioProximoVencimientoEvent
- [ ] NotificationsListener: servicio.proximo_vencimiento

### Fase 5: Integración Frontend (documentar)

- [ ] UI: catálogo de tipos de servicio (duración, días, rampa, refacciones, recurrencia)
- [ ] UI: selector de tipo de servicio al agendar → filtra slots por días y duración
- [ ] UI: alerta si faltan refacciones (opcional, informativa)
- [ ] UI: pantalla de planeación de servicios (vehículos por vencer, lista para llamar a clientes)

---

## 10. Consideraciones de Stock

- **Alcance:** Las partes tienen `branch_id`. La disponibilidad se verifica a nivel de sucursal.
- **Búsqueda group:** Si en el futuro se permite buscar stock a nivel grupo (legal_entity), se podría ampliar `checkPartsAvailability` con un parámetro `searchScope: 'local' | 'group'` similar a PartsService.

---

## 11. Resumen Ejecutivo

1. **service_types:** Catálogo con duración, uso de rampa, días agendables, categoría y **recurrencia** (cada N km o N meses).
2. **service_type_parts:** Refacciones requeridas por tipo de servicio.
3. **branch_ramps:** Rampas por sucursal para calcular disponibilidad.
4. **Slots:** Considerar duración, días, mecánicos y rampas.
5. **Mantenimiento sin refacciones:** Emitir evento y enviar email a gerente de refacciones y gerente de taller.
6. **Roles:** PARTS_MANAGER, MANAGER, AFTERSALES_MANAGER ya existen; usarlos para notificaciones.
7. **Servicios recurrentes:** `recurrence_km_interval` y `recurrence_months_interval` en service_types; `service_type_id` en service_orders para calcular próxima vez.
8. **Planeación:** Endpoint `GET /service-planning/due` para listar vehículos con servicio próximo a vencer.
9. **Llamada a clientes:** Cron job diario que emite `servicio.proximo_vencimiento` → WhatsApp/email al cliente; tabla `service_due_notifications` para evitar spam.

---

*Documento generado para NexDMS. Ajustar según prioridades.*
