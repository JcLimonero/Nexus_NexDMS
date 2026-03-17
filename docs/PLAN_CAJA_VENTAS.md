# Plan de Implementación — Módulo Caja y Ventas

## Objetivo
Reemplazar los placeholders de `caja` y `ventas` por el módulo completo con Caja (sesiones), Ventas POS y Listas de precio, siguiendo el flujo Plan-Ejecuta-Valida.

## API existente

### Caja (cash-register)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Sesión activa | GET | `/api/v1/cash-register/active-session?branchId=uuid` | 404 si no hay |
| Abrir | POST | `/api/v1/cash-register/open` | Body: branchId, openingBalance |
| Cerrar | POST | `/api/v1/cash-register/close?branchId=uuid` | Body: closingBalance, closingNotes? |
| Sesiones | GET | `/api/v1/cash-register/sessions` | branchId?, page?, limit? |
| Sesión | GET | `/api/v1/cash-register/sessions/:id` | Detalle |

### Estados de sesión
- OPEN: Abierta
- CLOSED: Cerrada

### Ventas (sales)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Ventas | GET | `/api/v1/sales` | clientId?, status?, cashSessionId?, branchId?, page?, limit? |
| Venta | GET | `/api/v1/sales/:id` | Detalle con items, payments, client |
| Crear | POST | `/api/v1/sales` | Requiere caja abierta |
| Cancelar | POST | `/api/v1/sales/:id/cancel` | Body: motivo? |

### Estados de venta
- OPEN: Abierta
- PAID: Pagada
- CANCELLED: Cancelada

### Listas de precio (price-lists)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Listas | GET | `/api/v1/price-lists` | branchId?, isActive? |
| Lista | GET | `/api/v1/price-lists/:id` | Detalle |
| Crear | POST | `/api/v1/price-lists` | branchId, name, type, discountPct?, isActive? |
| Actualizar | PATCH | `/api/v1/price-lists/:id` | |
| Eliminar | DELETE | `/api/v1/price-lists/:id` | Solo MANAGER+ |

### Tipos de lista
- PUBLIC: Público
- WHOLESALE: Mayoreo
- BUSINESS: Empresa

## Orden de implementación

### 1. Modelos
- [ ] `models/cash-session.model.ts`
- [ ] `models/sale.model.ts`
- [ ] `models/price-list.model.ts`

### 2. Servicio
- [ ] `caja-ventas.service.ts` — CashRegister, Sales, PriceLists

### 3. Rutas
- [ ] `caja-ventas.routes.ts` — Caja (sesiones, sesion/:id), Ventas (list, nueva, :id), Listas (list, nueva, :id/editar)

### 4. Caja
- [ ] `caja/sesiones/sesiones-list.ts` — Lista sesiones, botón abrir/cerrar según estado
- [ ] `caja/sesiones/sesion-detail.ts` — Detalle sesión cerrada
- [ ] `caja/sesiones/abrir-caja-modal` o formulario inline

### 5. Ventas
- [ ] `ventas/list/ventas-list.ts`
- [ ] `ventas/form/venta-form.ts` — Nueva venta (partes, pagos, cliente opcional)
- [ ] `ventas/detail/venta-detail.ts` — Ver venta, cancelar si aplica

### 6. Listas de precio
- [ ] `listas-precio/list/listas-precio-list.ts`
- [ ] `listas-precio/form/lista-precio-form.ts`

### 7. Integración
- [ ] `content-routes.ts` — cargar caja-ventas.routes
- [ ] `nav.service.ts` — rutas: /caja, /caja/ventas, /caja/listas-precio

## Validación
- [ ] Build web exitoso
- [ ] Tests integración API (cash-register, sales)
- [ ] Navegación funcional
