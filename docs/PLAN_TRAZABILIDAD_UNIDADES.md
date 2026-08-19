# Plan de Implementación — Trazabilidad de Unidades

## Objetivo
Implementar el historial de clientes relacionados con cada unidad y la trazabilidad del ciclo de vida: nueva disponible → vendida → entregada → (devolución) seminueva disponible → seminueva vendida.

## Flujo de estados

| Estado | conditionType | status | Descripción |
|--------|---------------|--------|-------------|
| Nueva disponible | NEW | AVAILABLE | Unidad nueva en agencia |
| Nueva vendida | NEW | SOLD | Vendida, pendiente entrega |
| Nueva entregada | NEW | SOLD | Vendida y entregada (deliveryDate) |
| Seminueva disponible | USED | AVAILABLE | Cliente la devolvió, disponible de nuevo |
| Seminueva vendida | USED | SOLD | Vendida como seminueva |

## Orden de implementación

### 1. API — Migración y entidades

- [x] **Migración**: Añadir columna `condition_type` (enum NEW | USED) a `catalog_units`. Default NEW.
- [x] **Entidad CatalogUnit**: Añadir `conditionType: CatalogUnitConditionEnum`.
- [x] **Entidad UnitReturn**: Nueva tabla `unit_returns` para recompra (cliente vende de vuelta a la agencia).
  - `id`, `tenant_id`, `catalog_unit_id`, `client_id`, `unit_sale_id` (venta original)
  - `return_date`, `buyback_price`, `mileage`, `notes`
  - `created_at`, `updated_at`

### 2. API — Módulo Unit Returns

- [x] `unit-returns.module.ts`
- [x] `unit-returns.service.ts` — create, findAllByCatalogUnit
- [x] `unit-returns.controller.ts` — POST /unit-returns, GET /unit-returns/by-unit/:catalogUnitId
- [x] Al crear UnitReturn: actualizar CatalogUnit (conditionType=USED, status=AVAILABLE)

### 3. API — Historial de unidad

- [x] Endpoint `GET /api/v1/catalog-units/:id/history` en CatalogUnitsController
- [x] Respuesta: lista ordenada por fecha de eventos:
  - `{ type: 'ACQUISITION', date, ... }` — ingreso a agencia
  - `{ type: 'SALE', date, clientId, clientName, finalPrice, deliveryDate, folio, ... }` — venta
  - `{ type: 'RETURN', date, clientId, clientName, buybackPrice, ... }` — recompra

### 4. Frontend — Modelos y servicio

- [x] `UnitHistoryEvent` en catalog-unit.model.ts
- [x] `inventario-unidades.service.ts` — método `getUnitHistory(id)`, `createUnitReturn(dto)`

### 5. Frontend — Componente historial

- [x] Integrar en `unidad-detail` como sección "Historial de clientes" (timeline inline)

### 6. Frontend — Formulario recompra

- [x] Botón "Registrar recompra" en detalle de unidad (solo si status=SOLD)
- [x] Ruta `/inventario-unidades/:id/recompra` con formulario

## Estructura UnitReturn (API)

```typescript
// unit-return.entity.ts
catalogUnitId: string;
clientId: string;        // cliente que la devuelve
unitSaleId: string;      // venta original (opcional, para trazabilidad)
returnDate: Date;
buybackPrice: number;
mileage?: number;
notes?: string;
```

## Estructura respuesta history

```typescript
interface UnitHistoryEvent {
  type: 'ACQUISITION' | 'SALE' | 'RETURN';
  date: string;
  id?: string;
  clientId?: string;
  clientName?: string;
  finalPrice?: number;
  buybackPrice?: number;
  deliveryDate?: string;
  folio?: string;
  mileage?: number;
}
```

## Dependencias existentes

- UnitSale ya tiene: clientId, finalPrice, deliveryDate, folio
- CatalogUnit ya tiene: acquisitionDate, status
- ClientsService para resolver nombres de clientes

## Convenciones

- Textos en español
- Fechas en formato ISO
- Toastr para feedback en acciones
