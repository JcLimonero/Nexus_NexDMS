# Plan de Implementación — Módulo Cotizaciones

## Objetivo
Reemplazar el placeholder de `cotizaciones` por el módulo completo para crear, editar, aprobar, enviar y convertir cotizaciones (refacciones, servicios y unidades), siguiendo el flujo Plan-Ejecuta-Valida.

## API existente

### Cotizaciones (`/api/v1/quotations`)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Listar | GET | `/api/v1/quotations` | type?, status?, clientId?, branchId?, dateFrom?, dateTo?, page?, limit? |
| Detalle | GET | `/api/v1/quotations/:id` | Con items, client, branch, user |
| Crear | POST | `/api/v1/quotations` | branchId, type, priceList, items[], clientId?, discountPct?, conditions?, validityDate? |
| Actualizar | PATCH | `/api/v1/quotations/:id` | Solo borrador |
| Aprobar | POST | `/api/v1/quotations/:id/approve` | Solo PENDING_APPROVAL |
| Rechazar | POST | `/api/v1/quotations/:id/reject` | Body: reason? |
| Enviar | POST | `/api/v1/quotations/:id/send` | Borrador o aprobada |
| Convertir | POST | `/api/v1/quotations/:id/convert` | Enviada, aceptada o aprobada |

### Tipos de cotización
- PARTS: Refacciones
- SERVICE: Servicio
- UNIT: Unidad

### Estados
- DRAFT: Borrador
- PENDING_APPROVAL: Pendiente de aprobación
- APPROVED: Aprobada
- SENT: Enviada
- ACCEPTED: Aceptada
- REJECTED: Rechazada
- EXPIRED: Expirada
- CONVERTED: Convertida

### Listas de precio
- PUBLIC: Público
- WHOLESALE: Mayoreo
- BUSINESS: Empresa

### Items de cotización
Cada ítem debe tener: partId O catalogUnitId O description. Además: quantity, unitPrice (opcional si hay parte/unidad), discount?.

## Orden de implementación

### 1. Modelos
- [x] `models/quotation.model.ts` — Quotation, QuotationItem, CreateQuotationDto, CreateQuotationItemDto, Filters

### 2. Servicio
- [x] `cotizaciones.service.ts` — findAll, findOne, create, update, approve, reject, send, convert

### 3. Rutas
- [x] `cotizaciones.routes.ts` — Lista, Nueva, Editar (:id/editar), Detalle (:id)

### 4. Componentes
- [x] `list/cotizaciones-list.ts` — Lista con filtros, paginación
- [x] `form/cotizacion-form.ts` — Crear/editar (items: partes, unidades o descripción manual)
- [x] `detail/cotizacion-detail.ts` — Ver, aprobar, rechazar, enviar, convertir

### 5. Integración
- [x] `content-routes.ts` — cargar cotizaciones.routes
- [x] `nav.service.ts` — ruta /cotizaciones (ya existe)

## Validación
- [x] Build web exitoso
- [x] Navegación funcional
