# Plan de Implementación — NexDMS

> Análisis técnico de las soluciones recomendadas y plan de implementación ejecutable.

**Proyecto:** NexDMS (DMS SaaS multi-tenant para grupos automotrices mexicanos)  
**Stack:** NestJS 11, TypeORM, PostgreSQL, Redis  
**Fecha:** Marzo 2025

---

## Resumen ejecutivo

Este documento detalla el plan de implementación para nueve soluciones técnicas identificadas en el informe de análisis del proyecto NexDMS. Las soluciones se han ordenado en **cinco fases** según sus dependencias, priorizando la infraestructura base antes de los módulos de negocio.

| Fase | Nombre | Soluciones | Duración estimada |
|------|--------|------------|-------------------|
| 1 | Infraestructura base | StorageService (B2), BullMQ, EventEmitter2 | 3-4 días |
| 2 | Auditoría y seguridad | AuditInterceptor, ThrottlerGuard, superadmin_audit_log | 2-3 días |
| 3 | Notificaciones | Módulo notificaciones, notificaciones_log, WhatsApp/Email/SMS | 4-5 días |
| 4 | CFDI | CfdiService, integración FacturAPI | 5-6 días |
| 5 | Cron y jobs | Recordatorios, alertas | 2-3 días |

**Dependencias clave:**
- CfdiService → StorageService (subir XML/PDF)
- CfdiService → CfdiLogModule (ya existe)
- Notificaciones → BullMQ, EventEmitter2
- CfdiService → EventEmitter2 (CfdiGeneradoEvent)
- Cron → EventEmitter2 (CitaRecordatorioEvent)

---

## Fase 1: Infraestructura base

### 1.1 StorageService (Backblaze B2)

**Propósito:** Almacenar XML/PDF CFDI, logos de sucursal, fotos de checklist PWA.

**Dependencias:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (ya instalados).

**Archivos a crear:**

| Archivo | Descripción |
|---------|-------------|
| `src/common/storage/storage.module.ts` | Módulo NestJS que exporta StorageService |
| `src/common/storage/storage.service.ts` | Servicio con upload, download, getSignedUrl |
| `src/config/b2.config.ts` | Factory de configuración B2 desde env |

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `app.module.ts` | Importar StorageModule |
| `.env.example` | Documentar B2_* (ya existen) |

**Implementación StorageService:**

```typescript
// Métodos principales:
upload(buffer: Buffer, key: string, contentType?: string): Promise<string>
download(key: string): Promise<Buffer>
getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>
delete(key: string): Promise<void>
```

**Estructura de keys sugerida:**
- `documentos/{tenantId}/{branchId}/cfdi/{uuid}.xml`
- `documentos/{tenantId}/{branchId}/cfdi/{uuid}.pdf`
- `logos/{tenantId}/{branchId}/logo.{ext}`
- `checklist/{tenantId}/{branchId}/{serviceOrderId}/{filename}`

**Consideraciones:**
- B2 es S3-compatible; usar `S3Client` con endpoint custom (`B2_ENDPOINT`)
- Credenciales: `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET_NAME`
- Testing: mockear S3Client en unit tests; integración con bucket de prueba

---

### 1.2 BullMQ (colas)

**Propósito:** Colas para notificaciones asíncronas y timbrado CFDI en background.

**Dependencias:** `@nestjs/bullmq`, `bullmq`, `ioredis` (ya instalados).

**Archivos a crear:**

| Archivo | Descripción |
|---------|-------------|
| `src/config/queue.config.ts` | Configuración BullMQ con Redis |
| `src/queues/queues.module.ts` | Módulo que registra BullModule.forRootAsync |

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `app.module.ts` | Importar QueuesModule (o BullModule.forRootAsync) |
| `.env.example` | REDIS_URL ya existe |

**Colas a registrar (Fase 3 y 4):**
- `notifications` — envío WhatsApp/Email/SMS
- `cfdi` — timbrado asíncrono (opcional, para no bloquear respuesta)

**Implementación:**

```typescript
// app.module.ts o queues.module.ts
BullModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    connection: {
      host: new URL(config.getOrThrow('REDIS_URL')).hostname,
      port: parseInt(new URL(config.getOrThrow('REDIS_URL')).port || '6379'),
      password: new URL(config.getOrThrow('REDIS_URL')).password || undefined,
    },
  }),
  inject: [ConfigService],
})
```

**Consideraciones:**
- Redis ya usado por AuthModule (refresh tokens); misma instancia Redis
- Procesadores se crearán en Fase 3 (notificaciones) y Fase 4 (CFDI)
- Testing: usar BullMQ `Queue`/`Worker` con Redis de test o mock

---

### 1.3 EventEmitter2

**Propósito:** Eventos de dominio para desacoplar módulos (VentaConfirmadaEvent, CfdiGeneradoEvent, etc.).

**Dependencias:** Instalar `@nestjs/event-emitter` (wrapper NestJS) o `eventemitter2`.

**Instalación:**
```bash
cd apps/api && npm install @nestjs/event-emitter
```

**Archivos a crear:**

| Archivo | Descripción |
|---------|-------------|
| `src/events/events.module.ts` | EventEmitterModule.forRoot() |
| `src/events/domain-events.ts` | Definición de eventos (clases/interfaces) |

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `app.module.ts` | Importar EventEmitterModule |

**Eventos de dominio (definir en `domain-events.ts`):**

```typescript
// Ejemplos
export class VentaConfirmadaEvent {
  constructor(
    public readonly saleId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly total: number,
    public readonly client: { email?: string; phone?: string },
  ) {}
}

export class CfdiGeneradoEvent {
  constructor(
    public readonly cfdiLogId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly total: number,
    public readonly client: { email?: string; phone?: string },
    public readonly xmlKey: string,
    public readonly pdfKey: string,
  ) {}
}

export class OsEstatusChangedEvent { ... }
export class CitaAgendadaEvent { ... }
export class CitaRecordatorioEvent { ... }
export class StockMinimoEvent { ... }
export class PagoCreditoVencidoEvent { ... }
export class CotizacionEnviadaEvent { ... }
```

**Consideraciones:**
- Los listeners se implementarán en Fases 3, 4 y 5
- Usar `@OnEvent('event.name')` en listeners
- Evitar lógica pesada en listeners; delegar a colas Bull si es necesario

---

### Checklist Fase 1

- [ ] StorageService sube archivo a B2 y retorna key
- [ ] StorageService genera URL firmada válida (1h)
- [ ] BullModule conecta a Redis correctamente
- [ ] EventEmitterModule emite y recibe eventos
- [ ] Build sin errores: `npm run build`
- [ ] Variables B2 y REDIS_URL en .env

---

## Fase 2: Auditoría y seguridad

### 2.1 AuditInterceptor

**Propósito:** Registrar automáticamente CREATE/UPDATE/DELETE en `audit_logs` para entidades configuradas.

**Dependencias:** AuditLogModule (existe), AuthGuard para obtener user.

**Archivos a crear:**

| Archivo | Descripción |
|---------|-------------|
| `src/common/interceptors/audit.interceptor.ts` | Interceptor que captura request/response y persiste en audit_logs |
| `src/common/decorators/auditable.decorator.ts` | Decorador para marcar controladores/endpoints que requieren auditoría |

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `app.module.ts` | Registrar AuditInterceptor globalmente o por módulo |
| `main.ts` | `app.useGlobalInterceptors(new AuditInterceptor(...))` si es global |

**Lógica del interceptor:**
- Interceptar `@Post()` → CREATE (payload_after)
- Interceptar `@Patch()`/`@Put()` → UPDATE (payload_before desde BD, payload_after del body)
- Interceptar `@Delete()` → DELETE (payload_before)
- Extraer `userId` de `request.user` (si existe)
- Extraer `tenantId` de `request.user` o del contexto
- Extraer `ip` de `request.ip`, `userAgent` de `request.headers['user-agent']`
- `tableName` y `recordId` desde metadata del handler o decorador

**Desafío:** El interceptor no tiene acceso directo a la entidad antes/después. Opciones:
1. **Decorador `@Auditable('table_name')`** en cada endpoint + inyectar repositorio en interceptor
2. **Middleware** que registra después del handler (usando `next()` y capturando response)
3. **Subscriber TypeORM** (`entitySubscribers`) para capturar cambios a nivel ORM

**Recomendación:** Usar **TypeORM Entity Subscriber** para `AuditLog` que escuche `afterInsert`, `afterUpdate`, `afterRemove` en entidades configuradas. Más robusto que interceptor HTTP.

**Archivos alternativos:**
- `src/database/subscribers/audit.subscriber.ts` — suscribirse a entidades: Sale, ServiceOrder, PurchaseOrder, etc.

**Consideraciones:**
- Excluir tablas sensibles o con payloads grandes (ej: `payload_before`/`payload_after` solo campos clave)
- LOGIN/LOGOUT se registran en AuthService (no en interceptor)

---

### 2.2 ThrottlerGuard

**Propósito:** Rate limiting en auth (login, refresh) y rutas públicas para mitigar brute-force.

**Dependencias:** Instalar `@nestjs/throttler`.

**Instalación:**
```bash
cd apps/api && npm install @nestjs/throttler
```

**Archivos a crear:**

| Archivo | Descripción |
|---------|-------------|
| `src/common/guards/throttler.guard.ts` | Opcional: guard custom si se necesita lógica diferente por ruta |

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `app.module.ts` | Importar ThrottlerModule.forRoot([...]) |
| `auth.controller.ts` | Aplicar `@Throttle()` más estricto en login/refresh |

**Configuración sugerida:**

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,   // 1 segundo
    limit: 3,    // 3 requests por segundo (login)
  },
  {
    name: 'short',
    ttl: 60000,  // 1 minuto
    limit: 10,   // 10 logins por minuto
  },
  {
    name: 'long',
    ttl: 60000,
    limit: 100,  // 100 req/min para rutas autenticadas
  },
]),
```

```typescript
// auth.controller.ts
@Post('login')
@Throttle({ short: { limit: 5, ttl: 60000 } })  // 5 intentos por minuto
login(@Body() dto: LoginDto) { ... }
```

**Rutas públicas a proteger:** `POST /auth/login`, `POST /auth/refresh`  
**Rutas autenticadas:** ThrottlerGuard global con límite más alto

**Consideraciones:**
- Throttler por defecto usa memoria; para producción con múltiples instancias, usar `ThrottlerStorageRedis` (Redis)
- Crear `ThrottlerStorageRedis` con Redis existente

---

### 2.3 superadmin_audit_log

**Propósito:** Auditoría de acciones del panel superadmin (admin.nexdms.com) ejecutadas por Nexus Q Tech.

**Archivos a crear:**

| Archivo | Descripción |
|---------|-------------|
| `src/database/migrations/XXXXXXX-AddSuperadminAuditLog.ts` | Migración para tabla `superadmin_audit_log` |
| `src/modules/superadmin-audit/entities/superadmin-audit-log.entity.ts` | Entidad TypeORM |
| `src/modules/superadmin-audit/superadmin-audit.module.ts` | Módulo |
| `src/modules/superadmin-audit/superadmin-audit.service.ts` | Servicio para registrar acciones |

**Esquema de tabla (según ARCHITECTURE.md):**

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| ejecutivo_email | VARCHAR(300) | Email del ejecutivo |
| accion | VARCHAR(100) | CREAR_TENANT, CREAR_SUCURSAL, CONFIG_CREDENCIALES, etc. |
| tenant_id | UUID | Nullable |
| sucursal_id | UUID | Nullable (branch_id) |
| detalle | JSONB | Payload sin secrets |
| ip | VARCHAR(50) | |
| created_at | TIMESTAMP | |

**Uso:** Inyectar `SuperadminAuditService` en controladores/servicios del panel admin. Llamar `log({ accion, tenantId, branchId, detalle })` cuando un SUPERADMIN ejecuta una acción.

**Consideraciones:**
- No incluir credenciales en `detalle`
- El panel admin puede estar en `apps/admin`; la API debe exponer endpoints que registren en superadmin_audit_log

---

### Checklist Fase 2

- [ ] AuditInterceptor o AuditSubscriber registra CREATE/UPDATE/DELETE en audit_logs
- [ ] ThrottlerGuard limita login a 5 req/min
- [ ] Tabla superadmin_audit_log creada
- [ ] SuperadminAuditService.log() persiste correctamente
- [ ] Build sin errores

---

## Fase 3: Notificaciones

### 3.1 Entidad notification_logs

**Archivos a crear:**

| Archivo | Descripción |
|---------|-------------|
| `src/database/migrations/XXXXXXX-AddNotificationLogs.ts` | Migración |
| `src/modules/notifications/entities/notification-log.entity.ts` | Entidad |

**Esquema sugerido (convención inglés):**

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| tenant_id | UUID | |
| branch_id | UUID | Nullable |
| channel | VARCHAR(20) | WHATSAPP, EMAIL, SMS |
| template_key | VARCHAR(50) | factura_generada, cita_confirmada, etc. |
| reference_type | VARCHAR(50) | Sale, ServiceOrder, Appointment, etc. |
| reference_id | UUID | |
| recipient | VARCHAR(300) | Teléfono, email |
| status | VARCHAR(20) | PENDING, SENT, FAILED |
| error_message | TEXT | Nullable |
| metadata | JSONB | Nullable |
| sent_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | |

---

### 3.2 Módulo de notificaciones

**Archivos a crear:**

| Archivo | Descripción |
|---------|-------------|
| `src/modules/notifications/notifications.module.ts` | Módulo NestJS |
| `src/modules/notifications/notifications.service.ts` | Servicio principal |
| `src/modules/notifications/notifications.controller.ts` | GET /log, POST /reenviar/:id |
| `src/modules/notifications/processors/notifications.processor.ts` | Bull processor para cola `notifications` |
| `src/modules/notifications/listeners/notifications.listener.ts` | EventEmitter2 listeners |
| `src/modules/notifications/providers/whatsapp.provider.ts` | Meta Cloud API |
| `src/modules/notifications/providers/email.provider.ts` | Resend |
| `src/modules/notifications/providers/sms.provider.ts` | Twilio |

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `app.module.ts` | Importar NotificationsModule |
| `branches.module.ts` | Exportar BranchConfig para obtener credenciales |

**Flujo:**
1. Evento (ej: CfdiGeneradoEvent) → NotificationsListener
2. Listener añade job a cola `notifications`
3. NotificationsProcessor consume job → llama a WhatsApp/Email/SMS provider
4. Registra en `notification_logs`

**Eventos escuchados (según docs):**
- CitaAgendadaEvent, CitaConfirmadaEvent → cita_confirmada
- CitaRecordatorioEvent → cita_recordatorio
- OsEstatusChangedEvent (LISTO) → os_lista_entrega
- CfdiGeneradoEvent → factura_generada + email con XML+PDF
- VentaConfirmadaEvent → ticket_cobro
- CotizacionEnviadaEvent → cotizacion_enviada
- StockMinimoEvent → email interno a ALMACEN
- PagoCreditoVencidoEvent → pago_vencido + SMS fallback

**Credenciales:** WhatsApp y Email desde `branch_config` (whatsapp_phone_id, whatsapp_token). Resend para email global (RESEND_API_KEY). Twilio para SMS.

**Consideraciones:**
- Templates WhatsApp deben estar aprobados por Meta
- Cifrado: desencriptar facturaapi_api_key, whatsapp_token al leer branch_config
- Reintentos: Bull 3 intentos con backoff exponencial

---

### Checklist Fase 3

- [ ] Migración notificaciones_log ejecutada
- [ ] NotificationsProcessor procesa jobs
- [ ] WhatsApp envía mensaje (template aprobado)
- [ ] Email envía con Resend
- [ ] SMS envía con Twilio (fallback)
- [ ] Registro en notification_logs
- [ ] GET /notifications/log con filtros
- [ ] POST /notifications/reenviar/:id

---

## Fase 4: CFDI (CfdiService + FacturAPI)

### 4.1 CfdiService

**Propósito:** Timbrado de facturas electrónicas vía FacturAPI, almacenamiento en B2, registro en CfdiLog.

**Dependencias:** StorageService, CfdiLogModule, BranchesModule (BranchConfig), EventEmitter2.

**Archivos a crear:**

| Archivo | Descripción |
|---------|-------------|
| `src/modules/cfdi/cfdi.module.ts` | Módulo CFDI |
| `src/modules/cfdi/cfdi.service.ts` | Servicio principal |
| `src/modules/cfdi/cfdi.controller.ts` | Endpoints GET, POST cancelar, POST reenviar |
| `src/modules/cfdi/cfdi-facturapi.client.ts` | Cliente HTTP para FacturAPI |
| `src/modules/cfdi/dto/*.dto.ts` | DTOs para filtros, cancelar, pago |
| `src/modules/cfdi/processors/cfdi.processor.ts` | (Opcional) Bull processor para timbrado asíncrono |

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `cfdi-log.module.ts` | Exportar para CfdiModule |
| `app.module.ts` | Importar CfdiModule |

**Flujo de timbrado (Ingreso):**
1. `CfdiService.generarIngreso(referenceType, referenceId)` — llamado desde SalesService, ServiceOrdersService, UnitSalesService al cerrar
2. Obtener datos del documento (cliente, ítems, total, método pago)
3. Obtener facturaapi_api_key de branch_config (desencriptar)
4. Construir payload FacturAPI (customer, items, use, payment_form, payment_method)
5. POST https://api.facturapi.io/v2/invoices
6. Recibir uuid, xml_url, pdf_url
7. Descargar XML y PDF
8. StorageService.upload(xml, key) y upload(pdf, key)
9. Insertar CfdiLog
10. Emitir CfdiGeneradoEvent

**Endpoints:**
- `GET /cfdi` — filtros: branchId, tipo, status, fechaDesde, fechaHasta, referenceId
- `GET /cfdi/:id` — detalle + links firmados XML/PDF
- `POST /cfdi/pago` — complemento de pago manual
- `POST /cfdi/:id/cancelar` — body: motivoCancelacion, cfdiSustitucionId?
- `POST /cfdi/:id/reenviar` — reenvía por WhatsApp + Email

**Integración con módulos existentes:**
- SalesService: al cerrar venta (confirmar pago) → `cfdiService.generarIngreso('Sale', saleId)`
- ServiceOrdersService: al cambiar estatus a ENTREGADO → `cfdiService.generarIngreso('ServiceOrder', id)`
- UnitSalesService: al confirmar venta → `cfdiService.generarIngreso('UnitSale', id)`

**Consideraciones:**
- FacturAPI: API key por sucursal en branch_config
- Claves SAT: product_key, unit_key según catálogo
- Cancelación: motivos 01, 02, 03, 04 (SAT)

---

### Checklist Fase 4

- [ ] CfdiService.generarIngreso() timbra correctamente
- [ ] XML y PDF se suben a B2
- [ ] CfdiLog se registra
- [ ] CfdiGeneradoEvent se emite
- [ ] GET /cfdi con filtros
- [ ] POST /cfdi/:id/cancelar
- [ ] Links firmados XML/PDF funcionan
- [ ] Integración con Sales, ServiceOrders, UnitSales

---

## Fase 5: Cron y jobs

### 5.1 @nestjs/schedule

**Propósito:** Recordatorios de citas 24h antes, alertas de stock mínimo, pagos vencidos.

**Dependencias:** Instalar `@nestjs/schedule`.

**Instalación:**
```bash
cd apps/api && npm install @nestjs/schedule
```

**Archivos a crear:**

| Archivo | Descripción |
|---------|-------------|
| `src/modules/cron/cron.module.ts` | ScheduleModule.forRoot() |
| `src/modules/cron/cron.service.ts` | Servicio con @Cron() |
| `src/modules/cron/jobs/appointment-reminders.job.ts` | Recordatorio citas |
| `src/modules/cron/jobs/stock-minimum.job.ts` | Alerta stock mínimo |
| `src/modules/cron/jobs/payment-overdue.job.ts` | Pagos vencidos |

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `app.module.ts` | Importar ScheduleModule, CronModule |

**Jobs:**

1. **Appointment reminders** — ejecutar diario 8:00 AM
   - Buscar citas con `scheduled_at` entre mañana 00:00 y mañana 23:59
   - Por cada cita: emitir CitaRecordatorioEvent
   - Listener: añade job a cola notificaciones

2. **Stock mínimo** — ejecutar diario 9:00 AM
   - Buscar partes con stock_actual <= stock_minimo
   - Por cada sucursal con alertas: emitir StockMinimoEvent
   - Listener: email a ALMACEN de la sucursal

3. **Pagos vencidos** — ejecutar diario 10:00 AM
   - Buscar payment_plans con parcelas vencidas y no pagadas
   - Emitir PagoCreditoVencidoEvent por cada cliente
   - Listener: WhatsApp + SMS fallback

**Consideraciones:**
- Usar zona horaria México (America/Mexico_City)
- Evitar solapamiento de jobs

---

### Checklist Fase 5

- [ ] Cron de recordatorios ejecuta a las 8:00
- [ ] CitaRecordatorioEvent se emite
- [ ] Notificación llega al cliente
- [ ] Stock mínimo alerta por email
- [ ] Pagos vencidos disparan notificación

---

## Matriz de dependencias

```
StorageService ──────────────────┐
                                 │
BullMQ ──────────────────────────┼──→ CfdiService
                                 │
EventEmitter2 ───────────────────┼──→ NotificationsListener
                                 │
CfdiLogModule ────────────────────┘
                                 
AuditLogModule ───────────────→ AuditInterceptor
                                 
@nestjs/throttler ───────────→ ThrottlerGuard

superadmin_audit_log ────────→ Standalone

NotificationsModule ─────────→ BullMQ (processor)
                            → EventEmitter2 (listeners)
                            → WhatsApp/Email/SMS

CfdiService ────────────────→ CfdiGeneradoEvent
                            → StorageService
                            → CfdiLogModule

@nestjs/schedule ───────────→ CitaRecordatorioEvent
                            → StockMinimoEvent
                            → PagoCreditoVencidoEvent
```

---

## Orden de implementación recomendado

1. **StorageService** — sin dependencias
2. **BullMQ + EventEmitter2** — configurar módulos
3. **AuditInterceptor** (o AuditSubscriber)
4. **ThrottlerGuard**
5. **superadmin_audit_log**
6. **Notificaciones** (entidad, módulo, processor, listeners)
7. **CfdiService** — integración FacturAPI
8. **Cron** — recordatorios y alertas

---

## Dependencias NPM a instalar

```bash
cd apps/api
npm install @nestjs/event-emitter
npm install @nestjs/schedule
npm install @nestjs/throttler
```

**Ya instaladas:** @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @nestjs/bullmq, bullmq, ioredis

---

## Variables de entorno adicionales

```env
# Ya existentes (verificar)
B2_ENDPOINT
B2_BUCKET_NAME
B2_KEY_ID
B2_APP_KEY
B2_BUCKET_URL
REDIS_URL
RESEND_API_KEY
TWILIO_SID
TWILIO_TOKEN
TWILIO_FROM
ENCRYPTION_KEY

# FacturAPI: por sucursal en branch_config (cifrado)
# WhatsApp: por sucursal en branch_config (cifrado)
```

---

## Consideraciones de testing

| Componente | Estrategia |
|------------|------------|
| StorageService | Mock S3Client; integración con bucket B2 de prueba |
| BullMQ | Redis de test o BullBoard para inspección |
| EventEmitter2 | Emitir evento y verificar listeners |
| AuditInterceptor | Request mock con user; verificar insert en audit_logs |
| ThrottlerGuard | Múltiples requests; verificar 429 |
| CfdiService | Mock FacturAPI; sandbox FacturAPI |
| Notifications | Mock WhatsApp/Resend/Twilio |
| Cron | Jest fake timers o ejecutar job manualmente |

---

## Checklist de validación por fase

### Fase 1 — Infraestructura base
| Ítem | Validación |
|------|------------|
| StorageService | `curl` a endpoint de prueba que sube y descarga archivo |
| BullMQ | Job añadido a cola y procesado |
| EventEmitter2 | Evento emitido y listener ejecutado |

### Fase 2 — Auditoría y seguridad
| Ítem | Validación |
|------|------------|
| AuditInterceptor/Subscriber | Crear/actualizar/eliminar entidad → registro en audit_logs |
| ThrottlerGuard | 6º login en 1 min → 429 Too Many Requests |
| superadmin_audit_log | Acción superadmin → registro en tabla |

### Fase 3 — Notificaciones
| Ítem | Validación |
|------|------------|
| notification_logs | Job procesado → registro con status SENT |
| WhatsApp | Mensaje recibido en teléfono de prueba |
| Email | Email recibido en bandeja |
| Reenvío | POST /notifications/reenviar/:id reintenta envío |

### Fase 4 — CFDI
| Ítem | Validación |
|------|------------|
| Timbrado | Venta cerrada → CfdiLog creado, XML/PDF en B2 |
| Cancelación | POST /cfdi/:id/cancelar → status CANCELLED |
| Links firmados | GET /cfdi/:id → URLs XML/PDF válidas 1h |

### Fase 5 — Cron
| Ítem | Validación |
|------|------------|
| Recordatorios | Cita mañana → CitaRecordatorioEvent → notificación |
| Stock mínimo | Parte bajo mínimo → StockMinimoEvent → email |
| Pagos vencidos | Parcela vencida → PagoCreditoVencidoEvent → WhatsApp/SMS |

---

## Referencias

- [FacturAPI Docs](https://docs.facturapi.io/)
- [Architecture](ARCHITECTURE.md)
- [CFDI/Notificaciones](modules/cfdi-notif-comisiones-reportes-pwa.md)
- [Backblaze B2 S3 API](https://www.backblaze.com/b2/docs/s3_compatible_api.html)
