# Módulo: Inventario y Ubicaciones

## Roles
- ALMACEN, ADMIN: CRUD completo + ajustes
- MOSTRADOR, MECANICO: solo lectura y búsqueda
- GERENTE_*: lectura + aprobación de ajustes

---

## Endpoints — Categorías

### GET /api/v1/inventario/categorias
### POST /api/v1/inventario/categorias
**Body:** `{ nombre, descripcion? }`

---

## Endpoints — Ubicaciones de almacén

### GET /api/v1/inventario/ubicaciones
Lista de ubicaciones por sucursal.

### POST /api/v1/inventario/ubicaciones
**Body:** `{ codigo, zona, pasillo?, estante?, nivel?, descripcion? }`
Código autogenerado si no se proporciona: `{zona}-{pasillo}-{estante}-{nivel}` → "B-2-14-C"

### PATCH /api/v1/inventario/ubicaciones/:id

---

## Endpoints — Partes

### GET /api/v1/inventario/partes
Query params: `search`, `categoriaId`, `tipoVehiculo`, `sucursalId`, `soloAlertas`, `activo`

### GET /api/v1/inventario/partes/:id
Incluye: últimos 10 movimientos, ubicación, stock por sucursal (si GERENTE_MARCA+).

### POST /api/v1/inventario/partes
**Body:**
```json
{
  "categoriaId": "uuid",
  "sucursalId": "uuid",
  "ubicacionId": "uuid?",
  "codigoSku": "string?",
  "codigoBarras": "string?",
  "nombre": "string",
  "descripcion": "string?",
  "tipoVehiculo": "MOTO|AUTO|AMBOS",
  "marcaCompatible": "string?",
  "unidadMedida": "PIEZA",
  "precioCompra": 100.00,
  "precioPublico": 150.00,
  "precioMayoreo": 130.00,
  "precioEmpresa": 120.00,
  "descuentoMaxPct": 10,
  "stockMinimo": 5,
  "stockMaximo": 100
}
```
SKU autogenerado si no se proporciona: `{tipo[0]}-{timestamp}` → "M-1703001234"

### PATCH /api/v1/inventario/partes/:id
No permite modificar `stockActual` directamente.

### DELETE /api/v1/inventario/partes/:id
Solo si `stockActual === 0`.

### POST /api/v1/inventario/partes/:id/imagen
Multipart. Solo jpeg/png/webp, max 5MB.

---

## Escaneo de código de barras (web + PWA)

### POST /api/v1/inventario/escanear
Recibe código escaneado y devuelve la parte correspondiente.
**Body:** `{ codigo: "string", sucursalId: "uuid" }`
**Lógica:** busca por `codigo_sku` primero, luego por `codigo_barras`.
**Response:** parte encontrada o 404.

### PATCH /api/v1/inventario/partes/:id/ubicacion
Actualiza la ubicación física de una parte escaneando destino.
**Body:** `{ ubicacionId: "uuid" }`
**Roles:** ALMACEN, ADMIN

---

## Endpoints — Movimientos y ajustes

### GET /api/v1/inventario/movimientos
Filtros: `parteId`, `tipoMovimiento`, `sucursalId`, `fechaDesde`, `fechaHasta`

### POST /api/v1/inventario/ajuste
**Roles:** ALMACEN, ADMIN
**Body:** `{ parteId, sucursalId, tipo: "ENTRADA_AJUSTE|SALIDA_AJUSTE", cantidad, notas }`
**Validación:** stock nunca negativo.

---

## Endpoints — Alertas

### GET /api/v1/inventario/alertas
Partes con `stock_actual <= stock_minimo`. Para badge en dashboard.

---

## Lógica de negocio

### Precio por tipo de cliente
Al buscar una parte para POS o cotización, recibir `tipoCliente` como parámetro.
Devolver el precio correspondiente: PUBLICO, MAYOREO o EMPRESA.
El campo `descuento_fijo` del cliente se aplica sobre el precio de lista como descuento adicional.

### Precedencia de descuentos — ORDEN OBLIGATORIO

Cuando el mostrador aplica un descuento manual en POS o cotización, seguir este orden:

```
1. Precio base = precio según lista del cliente (PUBLICO | MAYOREO | EMPRESA)
2. Descuento fijo cliente = precio_base * (cliente.descuento_fijo / 100)
   → precio_con_descuento_cliente = precio_base - descuento_fijo_cliente
3. Descuento manual del mostrador (si aplica)
   → Límite efectivo = MIN(parte.descuento_max_pct, sucursal.descuento_max_pct)
   → Si descuento_manual > límite_efectivo → requiere aprobación de GERENTE
   → precio_final = precio_con_descuento_cliente * (1 - descuento_manual / 100)
```

**Regla clave:** Prevalece el **menor** de los dos límites — `parte.descuento_max_pct` vs `sucursal.descuento_max_pct`. Ejemplo: parte con límite 5%, sucursal con límite 10% → el mostrador solo puede aplicar hasta 5% sin aprobación en esa parte específica.

**El `descuento_fijo` del cliente NO cuenta para el límite de aprobación** — es un precio pactado, no un descuento operativo.

**Ejemplo completo:**
```
Parte: precio_publico = $100, descuento_max_pct = 5%
Cliente empresa: descuento_fijo = 10%, tipo = EMPRESA → precio_empresa = $90
Precio con descuento fijo: $90 - ($90 * 10%) = $81
Mostrador aplica 6% adicional → supera límite de 5% → requiere aprobación gerente
Mostrador aplica 4% adicional → $81 * (1 - 4%) = $77.76 → OK sin aprobación
```

### Stock
- Nunca negativo. Validar en service antes de cualquier salida.
- Solo se modifica vía eventos de dominio:
  - `OcRecibidaEvent` → `ENTRADA_OC`
  - `VentaConfirmadaEvent` → `SALIDA_VENTA`
  - `OsPartesUsadasEvent` → `SALIDA_OS`
  - Transferencia enviada → `TRANSFERENCIA_OUT`
  - Transferencia recibida → `TRANSFERENCIA_IN`
  - Ajuste manual → `ENTRADA_AJUSTE` o `SALIDA_AJUSTE`
- Cada movimiento registra `stock_antes` y `stock_despues`.

### Alertas automáticas
Al guardar movimiento: si `stock_despues <= stock_minimo` → emitir `StockMinimoEvent`.
`StockMinimoEvent` → `NotifListener`: email a usuarios con rol ALMACEN de la sucursal.

## Eventos emitidos
- `StockMinimoAlcanzadoEvent` — stock llegó al mínimo
- `StockAgotadoEvent` — stock llegó a cero
