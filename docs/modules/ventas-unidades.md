# Módulo: Compras

## Endpoints — Proveedores
### GET /api/v1/compras/proveedores
Filtros: `search`, `activo`
### POST /api/v1/compras/proveedores
**Body:** `{ nombre, contacto?, telefono?, email?, rfc?, condicionesPago?, diasCredito }`
### PATCH /api/v1/compras/proveedores/:id
### DELETE /api/v1/compras/proveedores/:id — solo sin OCs activas

## Endpoints — Órdenes de Compra
### GET /api/v1/compras/ordenes
Filtros: `proveedorId`, `estatus`, `sucursalId`, `fechaDesde`, `fechaHasta`
### GET /api/v1/compras/ordenes/:id — incluye detalle y proveedor
### POST /api/v1/compras/ordenes
Crea en estatus `BORRADOR`. Folio: `OC-{YYYY}-{0001}`.
**Body:** `{ proveedorId, sucursalId, fechaEsperada?, notas?, detalle: [{ parteId, cantidad, precioUnitario }] }`
Calcula: `subtotal = SUM(cantidad * precioUnitario)`, `impuestos = subtotal * 0.16`, `total = subtotal + impuestos`

### PATCH /api/v1/compras/ordenes/:id — solo en BORRADOR
### POST /api/v1/compras/ordenes/:id/enviar — BORRADOR → ENVIADA (requiere ≥1 línea)
### POST /api/v1/compras/ordenes/:id/recibir
**Body:** `{ lineas: [{ ocDetalleId, cantidadRecibida }], cfdiProveedor?, notas? }`
Lógica: actualiza `cantidad_recibida`, determina PARCIAL o RECIBIDA, emite `OcRecibidaEvent`.
### POST /api/v1/compras/ordenes/:id/cancelar — solo BORRADOR o ENVIADA
**Body:** `{ motivo }`

## Flujo de estados
```
BORRADOR → ENVIADA → PARCIAL → RECIBIDA
         → CANCELADA
```

## Eventos emitidos
- `OcRecibidaEvent` → `InventarioListener` ingresa stock con `ENTRADA_OC`

---

# Módulo: Caja

## Reglas
- Solo una sesión ABIERTA por sucursal a la vez
- Toda venta requiere sesión ABIERTA en la sucursal

## Endpoints
### GET /api/v1/caja/sesion-activa?sucursalId=uuid — 404 si no hay
### POST /api/v1/caja/abrir
**Body:** `{ fondoInicial, sucursalId }`
### POST /api/v1/caja/cerrar
**Body:** `{ fondoFinal, notasCierre? }`
Calcula `diferencia = fondoFinal - (fondoInicial + totalEfectivo)`.
### GET /api/v1/caja/cortes — historial con filtros
### GET /api/v1/caja/cortes/:id — detalle con resumen de ventas del turno

---

# Módulo: Ventas (POS)

## Roles
- MOSTRADOR, ADMIN: crear ventas
- GERENTE_*: solo lectura

## Endpoints
### GET /api/v1/ventas — filtros: `clienteId`, `estatus`, `cajaSesionId`, `fechaDesde`, `fechaHasta`
### GET /api/v1/ventas/:id
### POST /api/v1/ventas
Crea y confirma en un solo paso dentro de una transacción.
**Body:**
```json
{
  "clienteId": "uuid?",
  "sucursalId": "uuid",
  "listaPrecios": "PUBLICO|MAYOREO|EMPRESA",
  "descuento": 0,
  "notas": "string?",
  "detalle": [{ "parteId": "uuid", "cantidad": 2, "precioUnitario": 150.00, "descuento": 0 }],
  "pagos": [
    { "metodo": "EFECTIVO", "monto": 100.00 },
    { "metodo": "TARJETA", "monto": 50.00, "referencia": "1234" }
  ]
}
```
`pagos` debe sumar exactamente el `total` calculado. Si hay un solo método, igualmente se envía como array de 1 elemento.

**Transacción:**
1. Verificar sesión ABIERTA en la sucursal
2. Verificar stock con `SELECT FOR UPDATE` por cada línea
3. Calcular totales usando `sucursal.tasa_iva`
4. Validar que `SUM(pagos.monto) == total`
5. Crear `venta` + `ventas_detalle` + `venta_pagos`
6. Derivar `venta.metodo_pago`: si 1 pago → su método. Si >1 → `MIXTO`
7. Actualizar `caja_sesiones`: sumar cada `venta_pagos.monto` al campo correspondiente (`total_efectivo`, `total_tarjeta`, `total_transferencia`)
8. Emitir `VentaConfirmadaEvent`
9. Generar número de ticket
10. Encolar impresión térmica si hay impresora configurada

**Errores:** "No hay caja abierta" · "Stock insuficiente para {nombre}: disponible {n}, solicitado {m}" · "Los pagos no suman el total de la venta"

### POST /api/v1/ventas/:id/cancelar — solo del día, requiere ADMIN o GERENTE
**Body:** `{ motivo }`

**Flujo completo de cancelación (dentro de una transacción):**
1. Verificar que la venta sea del día actual (`created_at::date = today`)
2. Revertir stock de cada `ventas_detalle` → `movimiento_inventario` tipo `ENTRADA_AJUSTE`, nota `"Cancelación venta {numero_ticket}"`
3. Restar los montos de `venta_pagos` de `caja_sesiones` (total_efectivo, total_tarjeta, total_transferencia según corresponda)
4. Actualizar `ventas.estatus = CANCELADA`
5. Si `ventas.cfdi_uuid` no es null → **NO cancelar CFDI automáticamente**. Mostrar alerta: _"Esta venta tiene CFDI timbrado ({uuid}). Cancélalo manualmente desde Facturación con motivo SAT."_
6. Emitir `VentaCanceladaEvent`

**Regla de IVA en cancelación:** Usar `sucursal.tasa_iva` de la sucursal donde ocurrió la venta, no el valor fijo 16%.

### GET /api/v1/ventas/:id/ticket — devuelve URL firmada del PDF del ticket (B2)

## Cálculo de totales
```
lineaSubtotal = (precioUnitario * cantidad) - descuentoLinea
subtotal = SUM(lineaSubtotal) - descuentoGlobal
impuestos = subtotal * sucursal.tasa_iva   ← NUNCA hardcodear 0.16
total = subtotal + impuestos
```
**Importante:** Siempre obtener `sucursal.tasa_iva` de la sucursal donde ocurre la venta. Puede ser 0.16 (normal) o 0.08 (zona fronteriza). El valor se almacena en la entidad `sucursales`.

## Impresión de ticket
- Térmica 80mm vía qz-tray desde el frontend
- El servidor también genera PDF y lo sube a B2
- PDF se envía por WhatsApp/email si el cliente tiene datos registrados

## Eventos emitidos
- `VentaConfirmadaEvent` → `InventarioListener` (descuenta stock) + `ComisionesListener` + `NotifListener`
- `VentaCanceladaEvent` → `InventarioListener` (revierte stock)

---

# Módulo: Unidades

## Endpoints — Catálogo

### GET /api/v1/unidades/catalogo
Filtros: `tipoVehiculo`, `marca`, `estatus`, `sucursalId`, `search`

### GET /api/v1/unidades/catalogo/:id

### POST /api/v1/unidades/catalogo
**Body:** `{ modeloGlobalId?, tipoVehiculo, marca, modelo, anio, version?, color, numeroSerie, numeroMotor?, cilindraje?, numPuertas?, precioCosto, precioLista, precioVenta, sucursalId, imagenKey?, notas?, fechaAdquisicion? }`
`numeroSerie` debe ser UNIQUE global.

### PATCH /api/v1/unidades/catalogo/:id
### POST /api/v1/unidades/catalogo/:id/imagenes — upload múltiple (max 10, 10MB c/u)

### POST /api/v1/unidades/escanear
**Body:** `{ numeroSerie, sucursalId }`
Devuelve la unidad correspondiente o 404.

### PATCH /api/v1/unidades/catalogo/:id/ubicacion
**Body:** `{ ubicacionId: "uuid" }`
Actualiza la ubicación física de la unidad.

## Endpoints — Apartados

### POST /api/v1/unidades/catalogo/:id/apartar
**Body:** `{ clienteId, montoAnticipo, notas? }`
Cambia estatus a `APARTADO`. Solo puede haber un apartado ACTIVO por unidad.

### POST /api/v1/unidades/apartados/:apartadoId/liberar
**Roles:** GERENTE_SUCURSAL+
**Body:** `{ motivo }`
Cambia unidad de vuelta a `DISPONIBLE`.

## Endpoints — Ventas de unidad

### GET /api/v1/unidades/ventas
Filtros: `clienteId`, `estatus`, `sucursalId`, `tipoFinanciamiento`, `fechaDesde`, `fechaHasta`

### GET /api/v1/unidades/ventas/:id

### POST /api/v1/unidades/ventas
**Body:**
```json
{
  "catalogoUnidadId": "uuid",
  "clienteId": "uuid",
  "cotizacionId": "uuid?",
  "apartadoId": "uuid?",
  "precioFinal": 45000.00,
  "enganche": 5000.00,
  "tipoFinanciamiento": "CONTADO|CREDITO_AGENCIA|CREDITO_BANCO",
  "bancoFinanciador": "string?",
  "folioBanco": "string?",
  "fechaEntrega": "2024-12-15",
  "notas": "string?"
}
```
**Gate de completado:** `precioFinal`, `metodoPago` o `planPagoId`, `fechaEntrega`.

### POST /api/v1/unidades/ventas/:id/completar
Cambia estatus a `COMPLETADA`. Unidad pasa a `VENDIDO`.
Si `tipoFinanciamiento = CREDITO_AGENCIA`, requiere que exista un `plan_pago` creado.
Encola generación de CFDI.

### POST /api/v1/unidades/ventas/:id/cancelar
**Roles:** ADMIN, GERENTE_MARCA+

## Endpoints — Financiamiento (crédito agencia)

### POST /api/v1/unidades/ventas/:id/plan-pago
**Body:** `{ numeroPagos, tasaInteres, fechaPrimerPago }`
Calcula automáticamente `montoMensual` y genera las `pagos_plan`.

### GET /api/v1/unidades/ventas/:id/plan-pago — incluye todas las parcialidades

### POST /api/v1/unidades/ventas/:ventaId/plan-pago/pagos/:pagoId/registrar
**Body:** `{ fechaPago, metodoPago, referenciaPago? }`
Marca parcialidad como PAGADO. Si es la última → plan pasa a LIQUIDADO.
Encola generación de complemento de pago CFDI (manual por el usuario desde módulo CFDI).

## Modelos globales
### GET /api/v1/unidades/modelos-globales
Filtros: `marcaNombre`, `tipoVehiculo`, `anio`
Sin scope — es catálogo global compartido. Solo lectura para todos los tenants.
