# NexDMS — Architecture Reference

> Documento de referencia para Claude (arquitecto) y Cursor (desarrollo).

---

## Visión general

NexDMS es un DMS SaaS multi-tenant para grupos automotrices mexicanos con múltiples marcas y sucursales. Maneja motos y autos en la misma instalación. Cada sucursal opera como entidad fiscal y operativa independiente.

### Jerarquía organizacional
```
Tenant (grupo empresarial)
  └── Marca (Honda, KIA, Geely...)
        └── Sucursal (agencia física)
              └── Usuarios operativos
```

---

## Stack tecnológico

| Capa            | Tecnología                                  |
|-----------------|---------------------------------------------|
| Backend         | NestJS 10+ · TypeScript 5+                 |
| ORM             | TypeORM con migrations                      |
| Base de datos   | PostgreSQL 15+                              |
| Caché / Queue   | Redis 7+ · Bull                             |
| Autenticación   | Passport JWT RS256                          |
| Validación      | class-validator · class-transformer         |
| Docs API        | Swagger / OpenAPI 3                         |
| Frontend web    | Angular 17+ standalone · Signals · Material |
| Frontend PWA    | Angular PWA · BarcodeDetector API           |
| Estilos         | Tailwind CSS v4                             |
| Storage         | Backblaze B2 (S3-compatible)               |
| Infra           | Docker · Nginx · GitHub Actions            |

---

## Arquitectura de capas

```
┌─────────────────────────────────────────────────────────────┐
│  Clientes                                                    │
│  Angular Web (desktop) · PWA Mecánico · Widget Citas (iframe)│
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / REST + JWT
┌──────────────────────▼──────────────────────────────────────┐
│  API Gateway — NestJS                                        │
│  AuthGuard · ScopeGuard · RolesGuard · ThrottlerGuard        │
│  ValidationPipe · TransformInterceptor · AuditInterceptor    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Módulos de dominio                                          │
│                                                              │
│  Core:      auth · users · tenants · marcas · sucursales     │
│  CRM:       clientes · contactos · vehiculos                 │
│  Catálogo:  modelos-globales · catalogo-unidades             │
│  Inventario: partes · ubicaciones · movimientos              │
│  Compras:   proveedores · ordenes-compra                     │
│  Almacén:   transferencias · apartados                       │
│  Caja/POS:  caja · ventas · lista-precios                    │
│  Unidades:  venta-unidades · financiamiento · apartados      │
│  Cotizaciones: cotizaciones (refacciones y unidades)         │
│  Taller:    ordenes-servicio · checklist · agenda            │
│  Garantías: garantias · devoluciones                         │
│  Fiscal:    cfdi · facturaapi                                │
│  Negocio:   comisiones · reportes                            │
│  Infra:     notificaciones · auditoria · configuracion       │
│                                                              │
│  Shared: storage · pdf · queue · events · cache · print      │
└──────┬─────────────────────────────────┬────────────────────┘
       │                                 │
┌──────▼──────────┐         ┌────────────▼──────────────────┐
│  PostgreSQL 15  │         │  Redis 7                       │
│  Base principal │         │  Caché · Sesiones · Bull Queue │
└─────────────────┘         └────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│  Servicios externos                                          │
│  FacturAPI · Backblaze B2 · Meta WhatsApp · Resend · Twilio  │
└──────────────────────────────────────────────────────────────┘
```

---

## Multi-tenancy

**Modelo:** single database, shared schema con discriminación por `tenant_id`.

**Flujo:**
1. Login → JWT incluye `{ tenantId, sucursalId, marcaId, rol, scope }`
2. `AuthGuard` valida token → puebla `request.user`
3. `ScopeGuard` aplica filtro de visibilidad según scope
4. Cada servicio filtra por `tenant_id` + scope

**Scopes:**
- `SUCURSAL` → ve solo datos de su `sucursal_id`
- `MARCA` → ve datos de todas las sucursales de su `marca_id`
- `GLOBAL` → ve todos los datos del `tenant_id`

---

## Catálogo global de modelos

Existe un catálogo maestro de modelos de vehículos mantenido por Nexus Q Tech (superadmin). Los tenants NO pueden modificarlo, solo usarlo. Cada sucursal crea su inventario (`catalogo_unidades`) basándose en este catálogo, agregando número de serie, color, precio y ubicación física.

```
modelos_globales (Nexus Q Tech mantiene)
  └── catalogo_unidades (cada sucursal crea su stock)
```

---

## Sistema de precios de refacciones

Tres niveles de precio por parte, configurables por GERENTE_MARCA o superior:

| Lista       | Aplica a                     | Configurable por      |
|-------------|------------------------------|-----------------------|
| PUBLICO     | Clientes sin clasificar      | GERENTE_MARCA+        |
| MAYOREO     | Clientes clasificados        | GERENTE_MARCA+        |
| EMPRESA     | Clientes tipo empresa        | GERENTE_MARCA+        |

El MOSTRADOR puede aplicar descuento manual adicional dentro del límite configurado por el gerente. Si supera el límite → requiere aprobación del GERENTE_SUCURSAL.

---

## Sistema de ubicaciones físicas

### Refacciones — sistema de coordenadas
```
Sucursal → Zona (A, B, C) → Pasillo (1, 2, 3) → Estante (01-99) → Nivel (A-E)
Ejemplo: "B-2-14-C" = Zona B, Pasillo 2, Estante 14, Nivel C
```

### Unidades — zonas por sucursal
```
Sucursal → Zona (LOTE, EXHIBICION, BODEGA) → Espacio (numerado)
Ejemplo: "LOTE-A-05" = Lote A, espacio 5
```

### Escaneo (PWA + Web)
- Cámara del celular: BarcodeDetector API (Chrome/Android) + fallback ZXing
- Pistola USB: input de teclado estándar, funciona sin config adicional
- Al escanear una parte → busca por `codigo_sku` o `codigo_barras` → actualiza `ubicacion_almacen`
- Al escanear una unidad → busca por `numero_serie` → actualiza `ubicacion_fisica`

---

## Apartado de unidades

- Se cobra anticipo (monto mínimo configurable por sucursal)
- El anticipo genera un registro de pago pero NO una venta completa
- La unidad pasa a estatus `APARTADO`
- NO hay expiración automática — solo el GERENTE_SUCURSAL puede liberar manualmente
- Al confirmar la venta: el anticipo se descuenta del total
- Si se cancela el apartado: política de devolución del anticipo definida por gerente

---

## Impresión y documentos

| Documento         | Canal físico          | Canal digital                    |
|-------------------|-----------------------|----------------------------------|
| Ticket POS        | Térmica 80mm (ESC/POS)| WhatsApp + Email                 |
| Ticket OS         | Térmica 80mm (ESC/POS)| WhatsApp + Email                 |
| Cotización        | PDF en cualquier impr.| WhatsApp + Email                 |
| CFDI              | PDF en cualquier impr.| WhatsApp + Email (obligatorio)   |
| Contrato venta    | PDF en cualquier impr.| Email                            |
| Checklist recep.  | — (firma digital)     | PDF adjunto a la OS en B2        |

**Stack de impresión:**
- Térmica: `qz-tray` (bridge Java entre browser y impresora) o librería `escpos`
- PDF: generado server-side con `pdfkit` en NestJS, logo de la sucursal desde B2
- El cliente SIEMPRE recibe copia digital independientemente de la impresión física

---

## Portal público de citas

Widget Angular embebible (iframe) en el sitio web de cada agencia.

```
URL pública: https://citas.nexdms.com/[sucursal-slug]
Parámetros: ?sucursal=honda-norte&tipo=servicio|venta
```

- No requiere login del cliente
- Muestra disponibilidad de la sucursal en tiempo real
- Cliente ingresa: nombre, teléfono, vehículo, tipo de servicio, fecha/hora
- Se crea una `Cita` en estatus `PENDIENTE_CONFIRMACION`
- El sistema envía confirmación por WhatsApp al cliente
- El personal confirma desde el sistema interno

---

## Facturación CFDI — FacturAPI

**Modelo:** cada sucursal tiene su propia organización en FacturAPI con su RFC.

**Tipos de CFDI generados:**
| Tipo    | Cuándo                                          | Quién lo emite      |
|---------|-------------------------------------------------|---------------------|
| Ingreso | Al cerrar venta POS, OS, venta de unidad        | Automático          |
| Egreso  | Devoluciones, notas de crédito                  | Manual por gerente  |
| Pago    | Complemento pago para créditos                  | Manual por usuario  |

**Cancelación:** solo ADMIN o GERENTE_SUCURSAL, con motivo SAT obligatorio.

**Flujo de timbrado:**
```
Evento de cierre → CfdiService.generar(referencia)
  → Construye payload para FacturAPI
  → POST a FacturAPI con org de la sucursal
  → Recibe UUID SAT + XML + PDF
  → StorageService.upload(xml, 'documentos/[tenant]/[sucursal]')
  → StorageService.upload(pdf, 'documentos/[tenant]/[sucursal]')
  → Guarda CfdiLog en BD
  → Emite CfdiGeneradoEvent → NotifListener (envía por WhatsApp + Email)
```

---

## Notificaciones — WhatsApp por sucursal

Cada sucursal tiene sus credenciales propias en `sucursal_config` (cifradas AES-256).

**Eventos que disparan notificación:**

| Evento                   | Canal              | Remitente          |
|--------------------------|--------------------|--------------------|
| Cita agendada            | WhatsApp           | Número de la sucursal |
| Confirmación de cita     | WhatsApp           | Número de la sucursal |
| Recordatorio 24h antes   | WhatsApp           | Número de la sucursal |
| OS lista para entrega    | WhatsApp           | Número de la sucursal |
| Factura generada         | WhatsApp + Email   | Número de la sucursal |
| Ticket de cobro          | WhatsApp           | Número de la sucursal |
| Cotización enviada       | WhatsApp + Email   | Número de la sucursal |
| Pago de crédito vencido  | WhatsApp + SMS     | Número de la sucursal |
| Stock mínimo alcanzado   | Email interno      | Sistema             |

**Templates Meta:** deben ser aprobados por Meta antes de usar. Un set de templates base es provisto por Nexus Q Tech durante el onboarding de cada sucursal.

---

## Eventos de dominio (EventEmitter2)

```
VentaConfirmadaEvent     → InventarioListener, ComisionesListener, NotifListener
OsEstatusChangedEvent    → NotifListener (si LISTO → WhatsApp al cliente)
OsEntregadaEvent         → ComisionesListener
OcRecibidaEvent          → InventarioListener (ingresa stock)
CitaAgendadaEvent        → NotifListener
CitaRecordatorioEvent    → NotifListener (cron diario 8am)
CfdiGeneradoEvent        → NotifListener (envía XML+PDF)
StockMinimoEvent         → NotifListener (email a ALMACEN)
PagoCreditoVencidoEvent  → NotifListener (WhatsApp+SMS al cliente)
```

---

---

## Panel Superadmin — auditoría interna

El panel `admin.nexdms.com` usa JWT propio con rol `SUPERADMIN`. Las acciones de los ejecutivos de Nexus Q Tech se registran en una tabla `superadmin_audit_log` dentro del mismo schema pero sin `tenant_id` — es un log global de operaciones sobre la plataforma.

### `superadmin_audit_log`
| Columna         | Tipo         | Notas                                              |
|-----------------|--------------|----------------------------------------------------|
| id              | UUID PK      |                                                    |
| ejecutivo_email | VARCHAR(300) | Email del ejecutivo de Nexus Q Tech                |
| accion          | VARCHAR(100) | `CREAR_TENANT`, `CREAR_SUCURSAL`, `CONFIG_CREDENCIALES`, `IMPORTAR_CSV`, `SUSPENDER_TENANT`, etc. |
| tenant_id       | UUID         | Nullable. Tenant afectado                          |
| sucursal_id     | UUID         | Nullable. Sucursal afectada                        |
| detalle         | JSONB        | Payload de la acción (sin incluir secrets)         |
| ip              | VARCHAR(50)  |                                                    |
| created_at      | TIMESTAMP    |                                                    |

**Nota:** Al registrar acciones sobre `sucursal_config`, guardar en `detalle` solo los campos no sensibles (ej: `{ campo: "whatsapp_phone_id", accion: "actualizado" }`). **Nunca loggear el valor de credenciales cifradas.**

---

## Decisiones técnicas documentadas

| Decisión                          | Elección              | Razón                                              |
|-----------------------------------|-----------------------|----------------------------------------------------|
| CFDI                              | FacturAPI             | API limpia, SDK Node, mantenimiento fiscal incluido |
| Storage                           | Backblaze B2          | 80% más barato que S3, API S3-compatible            |
| Multi-tenant                      | Shared schema         | Volumen no justifica DB por tenant                  |
| IDs                               | UUID v4               | Sin exposición de volumen, merge entre entornos     |
| Queue                             | Bull + Redis          | Redis ya usado para caché, sin dependencias extra   |
| Frontend state                    | Signals               | NgRx innecesario para esta escala                   |
| Roles                             | Rol × Scope           | Evita combinatoria, guards más limpios             |
| Precios                           | 3 listas por sucursal | Público, mayoreo, empresa                           |
| Precedencia descuentos            | MIN(parte, sucursal)  | El más restrictivo prevalece                        |
| Pagos mixtos                      | Tabla venta_pagos     | Permite cuadre de caja exacto por método           |
| Cancelación OS con partes         | Revertir stock siempre| Sin excepción — ENTRADA_AJUSTE con nota de folio   |
| Cancelación venta con CFDI        | No auto — alerta UI   | El usuario cancela CFDI manualmente con motivo SAT |
| Titular OS vs propietario vehículo| Confirmación explícita| Previene CFDIs con RFC incorrecto                  |
| totp_secret                       | Cifrado AES-256       | Mismo patrón que sucursal_config                   |
| Referencia cita↔OS               | Unidireccional (OS→cita)| Evita FK circular en migrations                  |
| km_actual vehículo                | Evento OsEntregada    | Actualización automática sin acción manual         |
| Impresoras                        | Tabla por sucursal    | El frontend sabe a qué impresora enviar cada doc   |
| Auditoría superadmin              | superadmin_audit_log  | Trazabilidad de acciones de ejecutivos Nexus Q Tech|
| Apartado unidades                 | Sin expiración auto   | Gerente decide manualmente                          |
| Complemento de pago CFDI          | Manual                | El usuario lo genera desde módulo CFDI             |
| Portal citas                      | Widget iframe         | Embebible en sitio web existente de la agencia     |
| Impresión térmica                 | qz-tray               | Bridge browser↔impresora sin drivers especiales    |
| Backup BD                         | pg_dump diario a B2   | Sin dependencia de servicio externo                |

---

## Variables de entorno requeridas

```env
# App
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
ENCRYPTION_KEY=...          ← Para cifrar credenciales en sucursal_config

# Database
DATABASE_URL=postgresql://user:pass@host:5432/nexdms

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=...
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# Backblaze B2
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_BUCKET_NAME=nexdms-files
B2_KEY_ID=...
B2_APP_KEY=...
B2_BUCKET_URL=https://f004.backblazeb2.com/file/nexdms-files

# Resend (email transaccional)
RESEND_API_KEY=...

# Twilio (SMS fallback)
TWILIO_SID=...
TWILIO_TOKEN=...
TWILIO_FROM=...

# Las credenciales de FacturAPI y WhatsApp se guardan
# en sucursal_config cifradas, no en variables de entorno globales
```
