# Reporte de validación NexDMS

**Fecha:** 16 de marzo de 2026  
**Proyecto:** apps/api  
**Plan de referencia:** docs/IMPLEMENTATION_PLAN.md

---

## Build: PASS ✅

El comando `npm run build` compiló correctamente sin errores.

---

## Lint: FAIL ❌

El comando `npm run lint` reportó **257 problemas** (247 errores, 10 advertencias).

### Resumen de errores por categoría

| Categoría | Cantidad | Archivos afectados |
|-----------|----------|-------------------|
| `@typescript-eslint/no-unsafe-*` (any, member-access, assignment, etc.) | ~180 | audit.interceptor, current-user.decorator, roles.guard, scope.guard, database.config, múltiples *.spec.ts |
| `@typescript-eslint/no-unused-vars` | ~25 | appointments.service, service-orders.service, unit-sales.service, warranties.service, suppliers.service, tenants.service, warehouse-transfers, etc. |
| `@typescript-eslint/no-require-imports` | 1 | database.config.ts |
| `@typescript-eslint/require-await` | 2 | jwt.strategy.ts, warehouse-transfers.service.ts |
| `@typescript-eslint/no-misused-promises` | 3 | auth.service.spec.ts |
| `@typescript-eslint/unbound-method` | 3 | auth.service.spec.ts, auth.e2e-spec.ts |
| `@typescript-eslint/no-floating-promises` | 1 | main.ts |
| `no-constant-binary-expression` | 1 | service-orders.service.ts |

### Archivos con más errores

- `audit.interceptor.ts` — 6 errores (unsafe assignment/member-access)
- `scope.guard.ts` — 14 errores
- `roles.guard.ts` — 3 errores
- `database.config.ts` — 3 errores (require, unsafe call)
- `*.spec.ts` — múltiples archivos con mocks `any` y variables no usadas
- `service-orders.service.ts` — 6 errores (unused vars, constant nullishness)
- `filter-suppliers.dto.ts` — 3 errores

---

## Migraciones: PASS ✅

El comando `npm run migration:run` ejecutó correctamente **3 migraciones nuevas**:

1. `AddSuperadminAuditLog1773644600000` — tabla `superadmin_audit_log`
2. `AddNotificationLogs1773644700000` — tabla `notification_logs`
3. `AddFacturaapiInvoiceIdToCfdiLog1773644800000` — columna `facturaapi_invoice_id` en `cfdi_logs`

---

## Tests: FAIL ❌

### Tests unitarios (`npm test`)

- **Resultado:** 3 suites fallidos, 7 pasados
- **Tests:** 24 fallidos, 52 pasados

#### Suites fallidos

1. **ServiceOrdersService** — Falta mock de `CfdiService`
   - Error: `Nest can't resolve dependencies of the ServiceOrdersService (... CfdiService at index [8])`
   - Archivo: `src/modules/service-orders/service-orders.service.spec.ts` línea 71

2. **UnitSalesService** — Falta mock de `CfdiService`
   - Error: `Nest can't resolve dependencies of the UnitSalesService (... CfdiService at index [7])`
   - Archivo: `src/modules/unit-sales/unit-sales.service.spec.ts` línea 83

3. **SalesService** — Probablemente mismo problema (CfdiService no mockeado)

### Tests E2E (`npm run test:e2e`)

- **Resultado:** 3 suites pasados, 7 tests pasados ✅
- **Advertencia:** Error no manejado al final: `Connection is closed` (Redis/BullMQ). No afecta el resultado de los tests pero indica que el cierre de conexiones podría mejorarse.

---

## Checklist: PASS con observaciones ⚠️

### Fase 1 — Infraestructura base

| Ítem | Estado | Notas |
|------|--------|-------|
| StorageService | ✅ | Implementado con upload, download, getSignedUrl, delete |
| BullMQ (QueuesModule) | ✅ | BullModule.forRootAsync + colas `notifications` y `cfdi` |
| EventEmitter2 (EventsModule) | ✅ | EventEmitterModule.forRoot() |
| Build sin errores | ✅ | — |
| Variables B2 y REDIS_URL | ⚠️ | Verificar en .env (no validado) |

### Fase 2 — Auditoría y seguridad

| Ítem | Estado | Notas |
|------|--------|-------|
| AuditInterceptor | ✅ | Registrado globalmente, usa auditContext |
| AuditSubscriber | ✅ | TypeORM subscriber para tablas auditadas |
| ThrottlerGuard | ✅ | Global + @Throttle en login/refresh (5 req/min) |
| superadmin_audit_log | ✅ | Migración, entidad, módulo, servicio |
| SuperadminAuditService.log() | ✅ | Implementado |

### Fase 3 — Notificaciones

| Ítem | Estado | Notas |
|------|--------|-------|
| notification_logs | ✅ | Migración y entidad |
| NotificationsProcessor | ✅ | Procesa cola `notifications` |
| NotificationsListener | ✅ | Escucha eventos de dominio |
| GET /notifications/log | ✅ | Con filtros |
| POST /notifications/reenviar/:id | ✅ | Reenvío de notificación |
| WhatsApp/Email/SMS providers | ✅ | Implementados (requieren credenciales) |

### Fase 4 — CFDI

| Ítem | Estado | Notas |
|------|--------|-------|
| CfdiService.generarIngreso() | ✅ | Implementado |
| StorageService (B2) para XML/PDF | ✅ | CfdiService usa StorageService |
| CfdiLog | ✅ | Registro de CFDI |
| CfdiGeneradoEvent | ✅ | Emitido tras timbrado |
| GET /cfdi con filtros | ✅ | FilterCfdiDto |
| POST /cfdi/:id/cancelar | ✅ | CancelCfdiDto |
| POST /cfdi/:id/reenviar | ✅ | Reenvío |
| **POST /cfdi/pago** | ❌ | **No implementado** — DTO existe (RegisterPagoDto) pero no hay endpoint ni método en CfdiService |
| Links firmados XML/PDF | ✅ | CfdiService.findOne retorna URLs firmadas |
| Integración Sales/ServiceOrders/UnitSales | ✅ | CfdiModule importado en esos módulos |

### Fase 5 — Cron

| Ítem | Estado | Notas |
|------|--------|-------|
| ScheduleModule | ✅ | CronModule |
| AppointmentRemindersJob | ✅ | @Cron 8:00 AM, America/Mexico_City |
| StockMinimumJob | ✅ | @Cron 9:00 AM |
| PaymentOverdueJob | ✅ | @Cron 10:00 AM |
| CitaRecordatorioEvent | ✅ | Emitido por AppointmentRemindersJob |
| StockMinimoEvent | ✅ | Emitido por StockMinimumJob |
| PagoCreditoVencidoEvent | ✅ | Emitido por PaymentOverdueJob |

---

## Errores encontrados

### 1. Tests unitarios — CfdiService no mockeado

**Archivos:**  
- `service-orders.service.spec.ts`  
- `unit-sales.service.spec.ts`  
- `sales.service.spec.ts` (si existe)

**Problema:**  
ServiceOrdersService, UnitSalesService y SalesService inyectan CfdiService. Los specs no proveen un mock para CfdiService, por lo que Nest no puede resolver las dependencias.

**Sugerencia:**  
Añadir en cada spec un provider mock:

```typescript
{
  provide: CfdiService,
  useValue: {
    generarIngreso: jest.fn().mockResolvedValue(undefined),
  },
},
```

### 2. Endpoint POST /cfdi/pago faltante

**Archivo:** `cfdi.controller.ts`

**Problema:**  
El plan define `POST /cfdi/pago` para complemento de pago manual. Existe `RegisterPagoDto` pero no hay endpoint ni método en CfdiService.

**Sugerencia:**  
Implementar en CfdiService un método `registerPago(cfdiLogId, dto)` que llame a FacturAPI para complemento de pago, y en CfdiController:

```typescript
@Post('pago/:id')
registerPago(@CurrentUser() user, @Param('id') id: string, @Body() dto: RegisterPagoDto) {
  return this.cfdiService.registerPago(user, id, dto);
}
```

### 3. Errores de ESLint (257 problemas)

**Problema:**  
Múltiples violaciones de reglas TypeScript/ESLint en producción y tests.

**Sugerencias por tipo:**

- **no-unsafe-*:** Tipar explícitamente `request`, `user`, mocks en specs (evitar `any`).
- **no-unused-vars:** Eliminar variables no usadas o prefijar con `_` (ej. `_reason`).
- **database.config.ts:** Reemplazar `require('dotenv')` por `import 'dotenv/config'` o `import { config } from 'dotenv'`.
- **no-floating-promises (main.ts):** Usar `void bootstrap()` o `bootstrap().catch(...)`.
- **no-constant-binary-expression (service-orders.service.ts):** Revisar expresión con `??` que siempre evalúa a constante.

### 4. Error Redis al cerrar tests E2E

**Problema:**  
`Error: Unhandled error. ([Error: Connection is closed.])` al finalizar los tests E2E.

**Sugerencia:**  
Revisar el cierre de conexiones BullMQ/Redis en `app.close()` o en el teardown de los tests E2E.

---

## Revisión de código

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Imports circulares | ✅ | No detectados |
| Módulos en app.module.ts | ✅ | StorageModule, QueuesModule, EventsModule, ThrottlerModule, AuditInterceptor, SuperadminAuditModule, NotificationsModule, CfdiModule, CronModule |
| Entidades y relaciones | ✅ | Revisión básica correcta |
| DTOs con validación | ✅ | FilterCfdiDto, CancelCfdiDto, RegisterPagoDto usan class-validator |
| AuditSubscriber registrado | ✅ | database.config.ts incluye `subscribers` |
| StorageModule global | ✅ | @Global() para uso en CfdiService |

---

## Acciones recomendadas para el implementador

1. **Prioridad alta**
   - Añadir mock de CfdiService en `service-orders.service.spec.ts`, `unit-sales.service.spec.ts` y `sales.service.spec.ts`.
   - Implementar endpoint `POST /cfdi/pago/:id` y método `registerPago` en CfdiService.

2. **Prioridad media**
   - Corregir los 257 errores de ESLint, empezando por `audit.interceptor.ts`, `scope.guard.ts`, `roles.guard.ts`, `database.config.ts` y `main.ts`.
   - Eliminar o tipar correctamente variables no usadas en servicios.

3. **Prioridad baja**
   - Revisar cierre de conexiones Redis/BullMQ en tests E2E.
   - Añadir `@ApiProperty()` a DTOs que se exponen en Swagger si aplica.

---

## Resumen ejecutivo

| Criterio | Resultado |
|----------|-----------|
| Build | ✅ PASS |
| Lint | ❌ FAIL (257 problemas) |
| Migraciones | ✅ PASS |
| Tests | ❌ FAIL (24 tests por CfdiService no mockeado) |
| Checklist | ⚠️ PASS con 1 ítem faltante (POST /cfdi/pago) |

**Conclusión:** La implementación está muy avanzada y la arquitectura cumple con el plan. Los fallos principales son: (1) tests unitarios que requieren mock de CfdiService, (2) endpoint POST /cfdi/pago no implementado, y (3) gran cantidad de errores de lint que conviene corregir para mantener calidad de código.
