# Plan de Implementación — Módulo Facturación

## Objetivo
Reemplazar el placeholder de `billing` por el módulo de Facturación, siguiendo el flujo Plan-Ejecuta-Valida. Centrado en CFDI (facturas fiscales) y plan NexDMS.

## API existente

### CFDI (`/api/v1/cfdi`)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Listar | GET | `/api/v1/cfdi` | branchId?, tipo?, status?, fechaDesde?, fechaHasta?, page?, limit? |
| Detalle | GET | `/api/v1/cfdi/:id` | Con xmlUrl, pdfUrl |
| Generar ingreso | POST | `/api/v1/cfdi/generar/:referenceType/:referenceId` | referenceType: Sale, ServiceOrder, UnitSale |
| Cancelar | POST | `/api/v1/cfdi/:id/cancelar` | Body: motivoCancelacion, cfdiSustitucionId? |
| Reenviar | POST | `/api/v1/cfdi/:id/reenviar` | |
| Complemento pago | POST | `/api/v1/cfdi/pago/:id` | Body: amount, paymentDate, paymentMethod |

## Estructura del módulo

### Rutas
- `/billing` — Landing con resumen CFDI y accesos rápidos
- `/billing/facturas` — Lista de CFDIs (reutiliza CfdiList)
- `/billing/facturas/:id` — Detalle CFDI (reutiliza CfdiDetail)
- `/billing/plan` — Plan NexDMS (placeholder SaaS)

### Componentes
- [x] `facturacion-landing/` — Dashboard con KPIs CFDI, últimas facturas, cards
- [x] Rutas que cargan CfdiList y CfdiDetail existentes
- [x] `billing-plan/` — Placeholder plan NexDMS

### Integración
- [x] Reutilizar CfdiService para datos
- [x] Nav: Facturación con submenú (Inicio, Facturas, Plan)
- [x] CfdiList/CfdiDetail: rutas relativas para funcionar en /cfdi y /billing/facturas

## Validación
- [x] Build web exitoso
- [x] Navegación funcional
