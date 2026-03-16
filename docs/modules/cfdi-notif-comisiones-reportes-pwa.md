# Módulo: CFDI (FacturAPI)

## Configuración
Cada sucursal tiene su propia organización en FacturAPI con su RFC.
`sucursal_config.facturaapi_api_key` — cifrado AES-256.
Al inicializar el cliente FacturAPI, siempre usar la API key de la sucursal del documento.

## Tipos de CFDI generados
| Tipo    | Trigger                                           | Automático |
|---------|---------------------------------------------------|------------|
| Ingreso | Cierre de venta POS, entrega de OS, venta unidad  | Sí         |
| Egreso  | Devoluciones, notas de crédito                    | Manual     |
| Pago    | Complemento de pago para crédito agencia          | Manual     |

## Flujo de timbrado (Ingreso — automático)
```
Evento de cierre → CfdiService.generarIngreso(referencia)
  → Construye payload FacturAPI desde los datos del documento
  → POST https://www.facturapi.io/v2/invoices con org de la sucursal
  → Recibe: { uuid, xml_url, pdf_url }
  → Descarga XML y PDF
  → StorageService.upload(xml, 'documentos/{tenant}/{sucursal}')
  → StorageService.upload(pdf, 'documentos/{tenant}/{sucursal}')
  → Guarda CfdiLog (uuid_sat, xml_key, pdf_key, referencia)
  → Emite CfdiGeneradoEvent
```

## Endpoints

### GET /api/v1/cfdi — filtros: `sucursalId`, `tipo`, `estatus`, `fechaDesde`, `fechaHasta`, `referenciaId`

### GET /api/v1/cfdi/:id — incluye links firmados a XML y PDF

### POST /api/v1/cfdi/pago
Genera complemento de pago manualmente.
**Roles:** MOSTRADOR, ADMIN, GERENTE_SUCURSAL+
**Body:** `{ cfdiRelacionadoId, pagoPlanId, metodoPago, fechaPago }`
Llama a FacturAPI para generar CFDI de tipo Pago.

### POST /api/v1/cfdi/:id/cancelar
**Roles:** ADMIN, GERENTE_SUCURSAL — con motivo SAT obligatorio.
**Body:** `{ motivoCancelacion: "01|02|03|04", cfdiSustitucionId? }`
Motivos SAT: 01=Comprobante con errores con relación · 02=Sin relación · 03=No se llevó a cabo · 04=Operación nominativa
Llama a FacturAPI para cancelar. Actualiza `cfdi_log.estatus = CANCELADO`.

### POST /api/v1/cfdi/:id/reenviar
Reenvía XML+PDF al cliente por WhatsApp y email.

### GET /api/v1/cfdi/:id/xml — URL firmada 1h del XML
### GET /api/v1/cfdi/:id/pdf — URL firmada 1h del PDF

## Payload FacturAPI — ejemplo venta OS
```javascript
{
  customer: {
    legal_name: cliente.razonSocial || `${cliente.nombre} ${cliente.apellido}`,
    tax_id: cliente.rfc,
    tax_system: cliente.regimenFiscal,
    address: { zip: cliente.cpFiscal }
  },
  items: osPartes.map(p => ({
    product: {
      description: p.parte.nombre,
      product_key: '25174800', // clave SAT refacciones
      unit_key: 'H87',
      price: p.precioUnitario,
      tax_included: false,
      taxes: [{ type: 'IVA', rate: 0.16 }]
    },
    quantity: p.cantidad
  })),
  // + mano de obra como ítem adicional
  use: 'G03', // Gastos en general
  payment_form: metodoPagoSAT, // 01=efectivo, 04=tarjeta, 03=transferencia
  payment_method: 'PUE' // Pago en una sola exhibición
}
```

---

# Módulo: Notificaciones

## Arquitectura
Todas las notificaciones son asíncronas vía Bull queue.
El worker `NotificacionesProcessor` consume la cola y ejecuta el envío.
Cada fallo se reintenta 3 veces con backoff exponencial.
Todo queda registrado en `notificaciones_log`.

## Configuración por sucursal
`whatsapp_phone_id` y `whatsapp_token` en `sucursal_config` (cifrado).
Al enviar, siempre usar las credenciales de la sucursal origen del evento.

## Templates WhatsApp (Meta Cloud API)
Templates deben estar aprobados por Meta previamente.
Set base de templates provistos por Nexus Q Tech en onboarding:

| Template key          | Evento                    | Variables                           |
|-----------------------|---------------------------|-------------------------------------|
| cita_confirmada       | Cita agendada/confirmada  | nombre, fecha, hora, tipo_servicio  |
| cita_recordatorio     | Recordatorio 24h antes    | nombre, fecha, hora                 |
| os_lista_entrega      | OS en estatus LISTO       | folio, vehiculo, total              |
| factura_generada      | CFDI generado             | folio_fiscal, total, link_pdf       |
| ticket_cobro          | Venta/OS cobrada          | total, metodo_pago                  |
| cotizacion_enviada    | Cotización enviada        | folio, total, vigencia              |
| pago_vencido          | Parcialidad vencida       | nombre, monto, fecha_vencimiento    |

## Endpoints
### GET /api/v1/notificaciones/log — filtros: `canal`, `tipo`, `estatus`, `fechaDesde`
### POST /api/v1/notificaciones/reenviar/:logId — reintenta una notificación fallida

## Eventos escuchados
```
CitaAgendadaEvent / CitaConfirmadaEvent → template: cita_confirmada
CitaRecordatorioEvent → template: cita_recordatorio
OsEstatusChangedEvent (LISTO) → template: os_lista_entrega (a contacto recepción Y titular)
CfdiGeneradoEvent → template: factura_generada + email con XML+PDF adjunto
VentaConfirmadaEvent → template: ticket_cobro (si cliente tiene WhatsApp)
CotizacionEnviadaEvent → template: cotizacion_enviada + email con PDF
StockMinimoEvent → email interno a ALMACEN de la sucursal
PagoCreditoVencidoEvent → template: pago_vencido + SMS fallback
```

---

# Módulo: Comisiones

## Modelo
Comisiones definidas manualmente por gerencia. No hay cálculo automático por %.
El sistema provee el marco para registrarlas, acumularlas y aprobarlas.

## Flujo
1. GERENTE crea/edita comisiones individuales en un período abierto
2. Al cerrar el período → estatus `EN_REVISION`
3. GERENTE aprueba cada comisión (`APROBADO`/`RECHAZADO`)
4. Período pasa a `APROBADO`
5. El pago se realiza externamente (nómina) — el sistema solo registra `PAGADO`

## Endpoints
### GET /api/v1/comisiones/periodos — filtros: `sucursalId`, `estatus`
### GET /api/v1/comisiones/periodos/:id — incluye todos los detalles del período

### POST /api/v1/comisiones/periodos
**Roles:** GERENTE_SUCURSAL+
**Body:** `{ sucursalId, periodo: "2024-12-01", tipo: "QUINCENAL|MENSUAL" }`

### POST /api/v1/comisiones/periodos/:id/detalle
Agrega una comisión individual.
**Body:** `{ usuarioId, referenciaId?, referenciaTipo?, concepto, base, monto }`

### PATCH /api/v1/comisiones/periodos/:id/detalle/:detalleId

### DELETE /api/v1/comisiones/periodos/:id/detalle/:detalleId

### POST /api/v1/comisiones/periodos/:id/cerrar → EN_REVISION
### POST /api/v1/comisiones/periodos/:id/detalle/:detalleId/aprobar
### POST /api/v1/comisiones/periodos/:id/detalle/:detalleId/rechazar
**Body:** `{ motivo? }`
### POST /api/v1/comisiones/periodos/:id/marcar-pagado → PAGADO (todos los aprobados)

### GET /api/v1/comisiones/resumen?usuarioId=&fechaDesde=&fechaHasta= — para el usuario ver sus comisiones

---

# Módulo: Reportes

## Formato
Todos los reportes: gráfica en dashboard (Chart.js en Angular) + export a Excel (xlsx) y PDF (pdfkit).
El scope del usuario determina qué datos ve (sucursal/marca/global).

## Endpoints

### GET /api/v1/reportes/ventas
Params: `sucursalId?`, `marcaId?`, `periodo: "dia|semana|mes|anio"`, `fechaDesde`, `fechaHasta`
**Response:** totales por período, desglose por método de pago, top 10 partes más vendidas.

### GET /api/v1/reportes/margen-unidades
Params: `sucursalId?`, `tipoVehiculo?`, `fechaDesde`, `fechaHasta`
**Response:** por unidad vendida: precio_costo, precio_final, margen_pesos, margen_pct.

### GET /api/v1/reportes/productividad-mecanicos
Params: `sucursalId?`, `fechaDesde`, `fechaHasta`
**Response:** por mecánico: OS cerradas, tiempo promedio por OS, mano de obra generada.

### GET /api/v1/reportes/rotacion-inventario
Params: `sucursalId?`, `categoriaId?`, `fechaDesde`, `fechaHasta`
**Response:** por parte: ventas período, stock actual, días de inventario, clasificación (A/B/C).

### GET /api/v1/reportes/cuentas-por-cobrar
Params: `sucursalId?`
**Response:** créditos vigentes, vencidos (<30d, 30-60d, >60d), por cliente.

### GET /api/v1/reportes/comparativo-sucursales
**Roles:** GERENTE_MARCA, GERENTE_GLOBAL, ADMIN
Params: `marcaId?`, `periodo`, `fechaDesde`, `fechaHasta`
**Response:** por sucursal: ventas, margen, OS cerradas, satisfacción (citas vs asistencias).

### GET /api/v1/reportes/perfil-cliente
Params: `sucursalId?`, `fechaDesde`, `fechaHasta`
**Response:** edad promedio, distribución por ciudad/estado, frecuencia de visita, tipo_cliente mix.

### GET /api/v1/reportes/mix-unidades
Params: `sucursalId?`, `fechaDesde`, `fechaHasta`
**Response:** ventas por tipo (MOTO/AUTO), por marca, por modelo, por segmento de cliente.

### GET /api/v1/reportes/proyeccion-ventas
Params: `sucursalId?`, `horizonte: 30|60|90`
**Response:** proyección simple basada en promedio de los últimos 3 períodos equivalentes + tendencia.
Nota: proyección estadística simple (media móvil), no ML.

### GET /api/v1/reportes/:tipo/export?formato=xlsx|pdf
Genera archivo y devuelve URL firmada B2 (expira en 24h).
El job de generación va a Bull queue — para reportes pesados devolver `{ jobId }` y poll con:
### GET /api/v1/reportes/jobs/:jobId — estatus del job de exportación.

---

# Módulo: PWA Mecánico

## Stack
Angular PWA en `apps/pwa`. Standalone, optimizado para móvil.
Service worker para caché offline de OS asignadas del día.
Autenticación: mismo JWT que el sistema principal.

## Pantallas

### Dashboard mecánico
- Lista de OS asignadas hoy, ordenadas por `fecha_promesa`
- Badge de estatus con color
- Acceso rápido a la OS activa

### Detalle de OS
- Datos del vehículo y falla reportada
- Checklist de recepción (solo lectura)
- Partes asignadas
- Tiempo registrado
- Fotos adjuntas
- Botones de acción según estatus

### Cambio de estatus
- Solo transiciones válidas del gate
- Campos requeridos como formulario inline antes de confirmar

### Escaneo de partes
- Activa cámara del celular con BarcodeDetector API
- Fallback: input manual de código
- Busca la parte por SKU o código de barras
- Agrega a la OS con cantidad (default 1)
- Confirma que hay stock suficiente antes de agregar

### Registro de tiempo
- Botón "Iniciar trabajo" / "Pausar"
- Timer visible mientras está activo
- Historial de bloques de tiempo del día

### Subir fotos
- Cámara del celular o galería
- Máximo 10 fotos por OS, 5MB c/u
- Preview antes de subir
- Sube directamente a B2 vía URL pre-firmada generada por el API

## Endpoints exclusivos PWA (mismo API, filtrado por rol MECANICO)
- `GET /api/v1/taller/ordenes?mecanicoId=me&fecha=hoy` — OS del día
- `POST /api/v1/taller/ordenes/:id/cambiar-estatus`
- `POST /api/v1/taller/ordenes/:id/partes` — con escaneo
- `POST /api/v1/taller/ordenes/:id/tiempo/iniciar`
- `POST /api/v1/taller/ordenes/:id/tiempo/pausar`
- `POST /api/v1/taller/ordenes/:id/fotos`
- `GET /api/v1/inventario/escanear` — busca parte por código

## Offline
Service worker cachea las OS asignadas al abrir la app.
En modo offline: solo lectura. Las acciones (cambio estatus, fotos) requieren conexión.
Al recuperar conexión: sincronización automática de cambios pendientes (si se implementa en Fase 3).
