# Plan de Implementación — Módulo Reportes

## Objetivo
Reemplazar el placeholder de `reportes` por el módulo de Reportes, siguiendo el flujo Plan-Ejecuta-Valida. Incluye Comisiones (API existente) y Reportes generales (placeholder).

## API existente

### Comisiones (`/api/v1/commissions`)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Listar períodos | GET | `/api/v1/commissions/periods` | branchId?, status?, type?, page?, limit? |
| Detalle período | GET | `/api/v1/commissions/periods/:id` | Con branch, approver, details, details.user |
| Crear período | POST | `/api/v1/commissions/periods` | branchId, periodDate, type |
| Enviar a revisión | POST | `/api/v1/commissions/periods/:id/submit-review` | |
| Aprobar | POST | `/api/v1/commissions/periods/:id/approve` | |
| Marcar pagado | POST | `/api/v1/commissions/periods/:id/mark-paid` | |
| Crear detalle | POST | `/api/v1/commissions/details` | periodId, userId, referenceId, referenceType, concept, baseAmount, amount |

### Estados período
- OPEN: Abierto
- UNDER_REVIEW: En revisión
- APPROVED: Aprobado
- PAID: Pagado

### Tipos período
- BIWEEKLY: Quincenal
- MONTHLY: Mensual

### APIs auxiliares
- Sucursales: GET `/api/v1/branches`

## Orden de implementación

### 1. Modelos
- [x] `models/commission.model.ts` — CommissionPeriod, CommissionDetail, filters, DTOs

### 2. Servicio
- [x] `reportes.service.ts` — getCommissionPeriods, getCommissionPeriod, createPeriod, submitForReview, approve, markAsPaid

### 3. Rutas
- [x] `reportes.routes.ts` — landing, comisiones (list), comisiones/nuevo, comisiones/:id, general (placeholder)

### 4. Componentes
- [x] `reportes-landing/reportes-landing.ts` — Dashboard con cards a Comisiones y Reportes
- [x] `comisiones/comisiones-list.ts` — Lista períodos con filtros
- [x] `comisiones/comision-period-form.ts` — Crear período
- [x] `comisiones/comision-period-detail.ts` — Ver período, acciones (enviar, aprobar, pagar)
- [x] `reportes/general` — Placeholder reportes generales

### 5. Integración
- [x] `content-routes.ts` — cargar reportes.routes
- [x] `nav.service.ts` — rutas: /reportes, /reportes/comisiones, /reportes/general

## Validación
- [x] Build web exitoso
- [x] Navegación funcional
