# Módulo: Cotizaciones

## Roles
- MOSTRADOR: cotizaciones de tipo REFACCIONES y SERVICIO
- VENDEDOR: cotizaciones de tipo UNIDAD
- GERENTE_SUCURSAL+: aprobación de descuentos que superan el límite

## Endpoints
### GET /api/v1/cotizaciones — filtros: `tipo`, `estatus`, `clienteId`, `fechaDesde`, `fechaHasta`
### GET /api/v1/cotizaciones/:id

### POST /api/v1/cotizaciones
**Body:**
```json
{
  "clienteId": "uuid?",
  "tipo": "REFACCIONES|SERVICIO|UNIDAD",
  "listaPrecidos": "PUBLICO|MAYOREO|EMPRESA",
  "descuentoPct": 0,
  "condiciones": "string?",
  "fechaVigencia": "date",
  "detalle": [
    { "parteId": "uuid?", "catalogoUnidadId": "uuid?", "descripcion": "string?", "cantidad": 1, "precioUnitario": 150.00, "descuento": 0 }
  ]
}
```
**Folio:** `COT-{YYYY}-{0001}`

**Lógica de aprobación:**
Si `descuentoPct > sucursal.descuentoMaxPct` → estatus `PENDIENTE_APROBACION` → notificar a GERENTE_SUCURSAL.
Si está dentro del límite → estatus `BORRADOR` directamente.

### POST /api/v1/cotizaciones/:id/aprobar — GERENTE_SUCURSAL+
### POST /api/v1/cotizaciones/:id/rechazar — GERENTE_SUCURSAL+, `{ motivo }`
### POST /api/v1/cotizaciones/:id/enviar
Genera PDF con logo de la sucursal y lo sube a B2.
Envía por WhatsApp + email si el cliente tiene datos.
Cambia estatus a `ENVIADA`.

### POST /api/v1/cotizaciones/:id/convertir
Convierte la cotización en OS (tipo SERVICIO/REFACCIONES) o venta de unidad (tipo UNIDAD) con un clic.
Cambia estatus a `CONVERTIDA`.
**Response:** `{ tipo: 'os'|'venta', id: 'uuid' }` — para redirigir al nuevo registro.

---

# Módulo: Taller

## Roles
- MOSTRADOR, ADMIN: crear y gestionar OS
- MECANICO: ver sus OS, cambiar estatus, agregar partes, registrar tiempo, subir fotos
- GERENTE_*: lectura + aprobación de garantías

## Gates de transición de estatus

| Transición                    | Campos requeridos                                             |
|-------------------------------|---------------------------------------------------------------|
| RECIBIDO → DIAGNOSTICO        | `fallaReportada`, `kmEntrada`, checklist creado              |
| DIAGNOSTICO → EN_PROCESO      | `mecanicoId`, `diagnostico`, `fechaPromesa`                  |
| EN_PROCESO → EN_ESPERA_PARTES | libre                                                         |
| EN_ESPERA_PARTES → EN_PROCESO | libre                                                         |
| EN_PROCESO → LISTO            | `trabajoRealizado`, `kmSalida`                               |
| LISTO → ENTREGADO             | `metodoPago`, `costoManoObra >= 0`                           |
| LISTO → ENTREGADO (con CFDI)  | + `titular.rfc`, `titular.regimenFiscal`, `titular.cpFiscal` |

**Validación de titular al crear OS:**
Cuando el vehículo pertenece a una empresa (`vehiculo.propietario.es_empresa = true`) y el `titularId` seleccionado es diferente al propietario del vehículo, mostrar banner de confirmación:
_"El vehículo está registrado a nombre de {propietario}. Estás facturando a {titular}. ¿Es correcto?"_
El usuario debe confirmar explícitamente antes de guardar. Esto previene CFDIs con RFC incorrecto.

## Endpoints — Órdenes de Servicio

### GET /api/v1/taller/ordenes
Filtros: `clienteId`, `mecanicoId`, `estatus`, `sucursalId`, `fechaDesde`, `fechaHasta`
Si el usuario es MECANICO → filtrar automáticamente por `mecanicoId = user.id`

### GET /api/v1/taller/ordenes/:id
Detalle completo: cliente, vehículo, mecánico, checklist, partes, tiempo, historial de estados.

### POST /api/v1/taller/ordenes
Crea en estatus `RECIBIDO`. Folio: `OS-{YYYY}-{0001}`.
**Body:**
```json
{
  "titularId": "uuid",
  "vehiculoId": "uuid",
  "contactoRecepcionId": "uuid?",
  "nombreRecepcion": "string?",
  "telefonoRecepcion": "string?",
  "sucursalId": "uuid",
  "mecanicoId": "uuid?",
  "citaId": "uuid?",
  "cotizacionId": "uuid?",
  "fallaReportada": "string",
  "kmEntrada": 12500,
  "fechaPromesa": "timestamp?",
  "notas": "string?"
}
```

### PATCH /api/v1/taller/ordenes/:id
Actualización parcial. Prohibido si estatus es ENTREGADO o CANCELADO.

### POST /api/v1/taller/ordenes/:id/cambiar-estatus
**Body:** `{ estatus, notas? }`
Valida el gate antes de cambiar. Lanza `BadRequestException` con campos faltantes si no pasa.

**Flujo especial — cancelación (estatus = CANCELADO):**
La cancelación ejecuta dentro de una transacción:
1. Verificar que estatus actual NO sea `ENTREGADO` (no se puede cancelar una OS ya entregada)
2. Por cada registro en `os_partes`: revertir stock → crear `movimiento_inventario` con tipo `ENTRADA_AJUSTE` y nota `"Cancelación OS {folio}"`
3. Si existe CFDI asociado (`cfdi_uuid` no null): el sistema NO cancela el CFDI automáticamente — muestra alerta al usuario: _"Esta OS tiene un CFDI timbrado. Cancélalo manualmente desde el módulo de Facturación antes o después de cancelar la OS."_
4. Actualizar `ordenes_servicio.estatus = CANCELADO`
5. Emitir `OsCanceladaEvent`

**Roles para cancelar:** MOSTRADOR puede cancelar en RECIBIDO y DIAGNOSTICO. GERENTE_SUCURSAL+ puede cancelar en cualquier estado previo a ENTREGADO.

### POST /api/v1/taller/ordenes/:id/asignar-mecanico
**Body:** `{ mecanicoId }`

### POST /api/v1/taller/ordenes/:id/partes
Agrega parte y descuenta stock.
**Body:** `{ parteId, cantidad }`
Recalcula `costo_partes` y `total` de la OS.

### DELETE /api/v1/taller/ordenes/:id/partes/:osParteId
Quita parte y revierte stock. Solo antes de LISTO.

### POST /api/v1/taller/ordenes/:id/tiempo/iniciar
**Roles:** MECANICO, ADMIN
Crea `os_tiempo` con `inicio = now()`. Solo si no hay otro registro sin `fin`.

### POST /api/v1/taller/ordenes/:id/tiempo/pausar
Cierra el `os_tiempo` activo con `fin = now()`. Calcula `minutos`.

### GET /api/v1/taller/ordenes/:id/tiempo — resumen de tiempo por mecánico

### POST /api/v1/taller/ordenes/:id/fotos
Upload de fotos del trabajo. Multipart, max 10 fotos, 5MB c/u.
Las keys se guardan como array en la OS (campo `fotos_keys` en BD).

## Endpoints — Checklist de Recepción

### GET /api/v1/taller/ordenes/:id/checklist — 404 si no existe
### POST /api/v1/taller/ordenes/:id/checklist — solo una vez por OS
**Body:** `{ nivelGasolina, kmEntrada, tieneLlantaExtra, tieneHerramienta, tieneDocumentos, tieneTapetes, observaciones?, danosDescripcion? }`

### POST /api/v1/taller/ordenes/:id/checklist/fotos — max 10, 5MB c/u
### POST /api/v1/taller/ordenes/:id/checklist/firma — PNG de firma digital

## Impresión de OS
`GET /api/v1/taller/ordenes/:id/pdf` — genera PDF con logo de sucursal, datos del vehículo, trabajo realizado, partes usadas, total. Sube a B2 y devuelve URL firmada.

## Eventos emitidos
- `OsEstatusChangedEvent` → NotifListener (si LISTO → WhatsApp al cliente/contacto recepción Y al titular)
- `OsPartesUsadasEvent` → InventarioListener (SALIDA_OS)
- `OsEntregadaEvent` → ComisionesListener · VehiculoListener (actualiza `vehiculos_cliente.km_actual = os.km_salida`)
- `OsCanceladaEvent` → InventarioListener (revierte stock de todas las `os_partes`)

---

# Módulo: Agenda

## Endpoints
### GET /api/v1/agenda/citas — filtros: `mecanicoId`, `sucursalId`, `estatus`, `fechaDesde`, `fechaHasta`
### GET /api/v1/agenda/citas/calendario?sucursalId=&fechaDesde=&fechaHasta= — para vista de calendario
### GET /api/v1/agenda/citas/:id
### GET /api/v1/agenda/disponibilidad?mecanicoId=&fecha=&sucursalId=&duracionMin= — slots disponibles del día

### POST /api/v1/agenda/citas
**Body:** `{ clienteId?, vehiculoId?, mecanicoId?, sucursalId, tipoServicio, fechaHora, duracionMin?, notas?, origen: "INTERNO" }`
Verifica disponibilidad del mecánico si se proporciona.
Envía WhatsApp de confirmación si hay número de cliente.

### POST /api/v1/agenda/citas/publica (sin autenticación — para widget iframe)
**Body:** `{ sucursalSlug, tipoServicio, fechaHora, nombreCliente, telefonoCliente, notas? }`
Crea cita en estatus `PENDIENTE_CONFIRMACION`. Envía WhatsApp al cliente.
El personal confirma internamente.

### PATCH /api/v1/agenda/citas/:id
### POST /api/v1/agenda/citas/:id/confirmar → CONFIRMADA + WhatsApp
### POST /api/v1/agenda/citas/:id/cancelar
**Body:** `{ motivo? }`
### POST /api/v1/agenda/citas/:id/completar → COMPLETADA
Si no existe OS ligada, crea OS automáticamente con datos de la cita.
**Relación cita↔OS:** La OS tiene `cita_id` (FK → citas). La cita NO tiene `orden_servicio_id` — la referencia es unidireccional para evitar FK circular. Para buscar la OS de una cita usar `SELECT * FROM ordenes_servicio WHERE cita_id = :citaId`.

## Cron de recordatorios
Job diario a las 8am: buscar citas del día siguiente con `recordatorio_enviado = false` → emitir `CitaRecordatorioEvent` → marcar `recordatorio_enviado = true`.

## Eventos emitidos
- `CitaAgendadaEvent` → NotifListener (WhatsApp)
- `CitaConfirmadaEvent` → NotifListener (WhatsApp)
- `CitaRecordatorioEvent` → NotifListener (WhatsApp 24h antes)

---

# Módulo: Garantías

## Roles
- GERENTE_SUCURSAL+: crear y autorizar garantías
- MOSTRADOR: solo crear, no autorizar

## Endpoints
### GET /api/v1/garantias — filtros: `clienteId`, `estatus`, `tipo`, `sucursalId`
### GET /api/v1/garantias/:id

### POST /api/v1/garantias
**Body:** `{ ventaUnidadId?, ordenServicioId?, clienteId, vehiculoId, tipo: "UNIDAD|REFACCION|SERVICIO", descripcion, fechaInicio, fechaFin }`

### POST /api/v1/garantias/:id/autorizar — GERENTE_SUCURSAL+
Cambia estatus a `EN_PROCESO`. Opcionalmente crea nueva OS sin costo.
**Body:** `{ crearOs: boolean, notas? }`

### POST /api/v1/garantias/:id/resolver
**Body:** `{ resolucion }`
Cambia estatus a `RESUELTA`.

### POST /api/v1/garantias/:id/rechazar — GERENTE_SUCURSAL+
**Body:** `{ motivo }`
