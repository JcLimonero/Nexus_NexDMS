# Plan de Implementación — Módulo CFDI

## Objetivo
Reemplazar el placeholder de `cfdi` por el módulo completo para consultar, descargar, cancelar y reenviar CFDIs, siguiendo el flujo Plan-Ejecuta-Valida.

## API existente

### CFDI (`/api/v1/cfdi`)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Listar | GET | `/api/v1/cfdi` | branchId?, tipo?, status?, fechaDesde?, fechaHasta?, referenceId?, page?, limit? |
| Detalle | GET | `/api/v1/cfdi/:id` | Incluye xmlUrl, pdfUrl (firmados 1h) |
| Registrar pago | POST | `/api/v1/cfdi/pago/:id` | Body: amount, paymentDate, paymentMethod, paymentReference? |
| Generar ingreso | POST | `/api/v1/cfdi/generar/:referenceType/:referenceId` | referenceType: Sale, ServiceOrder, UnitSale |
| Cancelar | POST | `/api/v1/cfdi/:id/cancelar` | Body: motivoCancelacion (01-04), cfdiSustitucionId? |
| Reenviar | POST | `/api/v1/cfdi/:id/reenviar` | Reenvía por WhatsApp/Email al cliente |

### Tipos de CFDI
- INCOME: Ingreso
- EXPENSE: Egreso
- PAYMENT: Pago

### Estados
- VALID: Vigente
- CANCELLED: Cancelado

### Motivos de cancelación SAT
- 01: Comprobante emitido con errores con relación
- 02: Comprobante emitido con errores sin relación
- 03: No se llevó a cabo la operación
- 04: Operación nominativa relacionada en la factura global

## Orden de implementación

### 1. Modelos
- [x] `models/cfdi-log.model.ts` — CfdiLog, CfdiFilters, CancelCfdiDto, RegisterPagoDto

### 2. Servicio
- [x] `cfdi.service.ts` — findAll, findOne, cancel, resend, registerPago, generarIngreso

### 3. Rutas
- [x] `cfdi.routes.ts` — Lista, Detalle (:id)

### 4. Componentes
- [x] `list/cfdi-list.ts` — Lista con filtros (sucursal, tipo, estado, fechas), paginación
- [x] `detail/cfdi-detail.ts` — Ver CFDI, descargar XML/PDF, cancelar, reenviar, registrar pago

### 5. Integración
- [x] `content-routes.ts` — cargar cfdi.routes
- [x] `nav.service.ts` — ruta /cfdi (ya existe)

## Validación
- [x] Build web exitoso
- [x] Navegación funcional
