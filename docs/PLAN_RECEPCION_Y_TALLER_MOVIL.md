# Plan: Recepción de Servicio y Taller Móvil

> Flujo completo: alta de estatus con fotos por ángulo, km, piezas cambiadas, seguimiento en taller, notificación de cotizaciones aparte con evidencia foto/video, y checklist de seguridad del mecánico.

**Fecha:** 2025-03-16

---

## 1. Resumen de Requerimientos

| Requerimiento | Descripción |
|---------------|-------------|
| **Alta de estatus completo** | Asesor de servicio registra estado completo de la unidad al ingreso |
| **Fotos por todos los lados** | Fotografías por ángulo (frontal, trasero, lateral izq/der, interior, tablero, etc.) |
| **Km de recepción** | Ya existe en reception_checklists.km_in |
| **Piezas cambiadas** | Mostrar las piezas que se le cambiaron (service_order_parts) + comentarios |
| **Dispositivo móvil** | Toda la captura y consulta debe ser usable en móvil (responsive, PWA o app nativa) |
| **Seguimiento en taller** | Cliente/asesor puede ver el progreso de la unidad en el taller |
| **Notificación por cotización aparte** | Si hay algo que cotizar por aparte: notificar al cliente con foto/video como evidencia |
| **Checklist de seguridad (mecánico)** | Validar puntos básicos: llantas, balatas, amortiguadores, limpiaparabrisas, etc. |

---

## 2. Estado Actual vs. Propuesto

### 2.1 Recepción (reception_checklists)

**Existe:**
- `km_in`, `fuel_level`, `has_spare_tire`, `has_tools`, `has_documents`, `has_mats`
- `observations`, `damage_description`, `client_signature_key`
- `photos_keys` (array de keys en storage) — **sin estructura por ángulo**

**Falta:**
- Fotos **estructuradas por ángulo/zona** (frontal, trasero, lateral izq, lateral der, interior, tablero/km, maletero, etc.)
- Endpoint de subida de fotos desde móvil (multipart/form-data)

### 2.2 Piezas cambiadas

**Existe:** `service_order_parts` (part_id, quantity, unit_price, subtotal)

**Falta:**
- Campo `notes` o `work_notes` por línea (opcional) para comentar detalles de cada pieza
- Vista/endpoint que muestre piezas cambiadas con comentarios al cliente

### 2.3 Seguimiento en taller

**Existe:** `service_orders.status` (RECEIVED, DIAGNOSIS, IN_PROGRESS, WAITING_PARTS, READY, DELIVERED)

**Falta:**
- **Historial de actualizaciones** con timestamp, usuario, mensaje (ej: "Iniciando diagnóstico", "Esperando refacciones")
- Endpoint para que asesor/mecánico agregue actualizaciones
- Vista para cliente/asesor de seguimiento en tiempo real

### 2.4 Notificación por cotización aparte

**No existe.** Requiere:
- Entidad para "hallazgos que requieren cotización"
- Foto o video como evidencia
- Notificación al cliente (WhatsApp/email) con enlace a la evidencia
- Flujo: mecánico detecta → registra hallazgo + media → sistema notifica

### 2.5 Checklist de seguridad (mecánico)

**No existe.** Requiere:
- Entidad o tabla de ítems de checklist
- Validación por el mecánico antes de entregar (o durante el servicio)
- Recomendaciones de ítems (ver sección 3)

---

## 3. Checklist de Seguridad — Recomendaciones

### 3.1 Puntos básicos (obligatorios para el plan)

| Ítem | Descripción | Valores sugeridos |
|------|-------------|-------------------|
| **Desgaste de llantas** | Profundidad del dibujo, estado general | BUENO / REGULAR / MALO / REEMPLAZAR |
| **Balatas (frenos)** | Estado de pastillas/discos | BUENO / REGULAR / MALO / REEMPLAZAR |
| **Amortiguadores** | Fugas, rebote, estabilidad | BUENO / REGULAR / MALO / REEMPLAZAR |
| **Limpiaparabrisas** | Estado de plumillas | BUENO / REGULAR / MALO / REEMPLAZAR |
| **Líquido de frenos** | Nivel y estado | BUENO / BAJO / REEMPLAZAR |
| **Refrigerante** | Nivel y estado | BUENO / BAJO / REEMPLAZAR |
| **Luces** | Frontales, traseras, direccionales, stop | OK / FALLA |
| **Batería** | Voltaje/estado si se mide | BUENO / REGULAR / REEMPLAZAR |

### 3.2 Puntos adicionales (opcionales, configurables)

| Ítem | Descripción |
|------|-------------|
| Correa de distribución | Estado, kilometraje desde último cambio |
| Filtro de aire | Estado |
| Suspensión (rotulas, terminales) | Juego, desgaste |
| Escape | Fugas, soportes |
| Nivel de aceite | Verificación |

### 3.3 Estructura del checklist

- **Catálogo de ítems** (`mechanic_checklist_items`): id, code, name, description, is_required, order
- **Respuestas por OS** (`mechanic_safety_checklists`): service_order_id, item_id, status (BUENO/REGULAR/MALO/REEMPLAZAR/OK/FALLA), notes, photo_key (opcional)
- El mecánico valida cada ítem; si hay REEMPLAZAR o FALLA, puede adjuntar foto y se considera "requiere atención"

---

## 4. Modelo de Datos Propuesto

### 4.1 Extensión de reception_checklists — Fotos por ángulo

**Opción A (recomendada):** Nueva tabla `reception_photos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| reception_checklist_id | uuid | FK reception_checklists |
| angle | varchar(20) | FRONT, REAR, LEFT, RIGHT, INTERIOR, DASHBOARD, TRUNK, OTHER |
| storage_key | varchar(500) | Key en B2/S3 |
| mime_type | varchar(100) | image/jpeg, video/mp4, etc. |
| created_at | timestamp | |

**Ángulos sugeridos:** FRONT, REAR, LEFT_SIDE, RIGHT_SIDE, INTERIOR, DASHBOARD (km visible), TRUNK, ENGINE, WHEELS (opcional)

**Opción B:** JSONB en reception_checklists con estructura `{ "FRONT": "key1", "REAR": "key2", ... }` — más simple pero menos flexible para múltiples fotos por ángulo.

### 4.2 service_order_parts — Notas por pieza

- Agregar columna `notes` (text, nullable) a `service_order_parts`.

### 4.3 Seguimiento — service_order_updates

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| service_order_id | uuid | FK service_orders |
| user_id | uuid | FK users (quien registra) |
| status | varchar(50) | Opcional: nuevo status o null si es solo mensaje |
| message | text | "Iniciando diagnóstico", "Esperando refacciones", etc. |
| created_at | timestamp | |

### 4.4 Cotización aparte — service_order_findings

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| service_order_id | uuid | FK service_orders |
| user_id | uuid | FK users (mecánico/asesor que detecta) |
| description | text | Descripción del hallazgo |
| requires_quotation | boolean | default true |
| media_type | varchar(20) | PHOTO, VIDEO |
| media_key | varchar(500) | Key en storage |
| client_notified_at | timestamp | Cuando se notificó al cliente |
| created_at | timestamp | |

- Al crear un finding con `requires_quotation=true` y `media_key`: emitir evento → NotificationsListener envía WhatsApp/email al cliente con enlace a la foto/video (URL firmada).

### 4.5 Checklist de seguridad — mechanic_checklist_items y mechanic_safety_checklists

**mechanic_checklist_items** (catálogo, por tenant o global):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK tenants |
| code | varchar(50) | TIRES, BRAKES, SHOCKS, WIPERS, etc. |
| name | varchar(200) | Desgaste de llantas |
| description | text | Opcional |
| is_required | boolean | default true |
| sort_order | int | Orden de aparición |

**mechanic_safety_checklists** (respuestas por OS):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| service_order_id | uuid | FK service_orders |
| item_id | uuid | FK mechanic_checklist_items |
| user_id | uuid | FK users (mecánico) |
| status | varchar(20) | BUENO, REGULAR, MALO, REEMPLAZAR, OK, FALLA |
| notes | text | Opcional |
| photo_key | varchar(500) | Opcional, evidencia |
| created_at | timestamp | |

---

## 5. Flujos de Usuario (Móvil)

### 5.1 Recepción (Asesor de servicio)

1. Crear OS (o ya existe desde cita).
2. Ir a "Checklist de recepción".
3. Capturar **km_in** (puede venir de foto del tablero).
4. Subir fotos por ángulo: frontal, trasero, lateral izq, lateral der, interior, tablero, maletero.
5. Completar: nivel de combustible, llanta de refacción, herramientas, documentos, tapetes.
6. Observaciones y daños previos.
7. Firma del cliente (opcional, ya existe client_signature_key).
8. Guardar.

### 5.2 Durante el servicio (Mecánico)

1. Ver OS asignada.
2. Completar **checklist de seguridad** (ítem por ítem, con foto si aplica).
3. Registrar **piezas cambiadas** (ya existe addPart) + notas por pieza.
4. Si detecta algo que cotizar aparte: crear **finding** con descripción + foto/video → sistema notifica al cliente.
5. Agregar **actualizaciones** de seguimiento ("Iniciando reparación", "Listo para entrega").

### 5.3 Seguimiento (Cliente / Asesor)

1. Ver estado actual de la OS.
2. Ver **historial de actualizaciones** (timeline).
3. Ver **findings** (cotizaciones aparte) con foto/video.
4. Ver **piezas cambiadas** con comentarios.
5. Ver **checklist de seguridad** (resumen).

### 5.4 Notificación al cliente

- Evento `servicio.hallazgo_cotizacion` cuando se crea un finding con requires_quotation=true.
- Listener: enviar WhatsApp/email con mensaje tipo "Hay un hallazgo en su unidad que requiere cotización. Ver evidencia: [link]".
- El link puede ser a una página web con la foto/video (URL firmada temporal) o a la app.

---

## 6. Endpoints Propuestos

### 6.1 Recepción

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /service-orders/:id/checklist | Crear checklist (existente, extender DTO) |
| POST | /service-orders/:id/checklist/photos | Subir foto por ángulo (multipart: file + angle) |
| GET | /service-orders/:id/checklist | Obtener checklist con fotos por ángulo |

### 6.2 Piezas

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /service-orders/:id/parts | Agregar pieza (existente, agregar notes al DTO) |
| PATCH | /service-orders/:id/parts/:partId | Actualizar notas de pieza |

### 6.3 Seguimiento

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /service-orders/:id/updates | Agregar actualización (message, status opcional) |
| GET | /service-orders/:id/updates | Listar actualizaciones (timeline) |

### 6.4 Hallazgos / Cotización aparte

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /service-orders/:id/findings | Crear hallazgo (description, file, requiresQuotation) |
| GET | /service-orders/:id/findings | Listar hallazgos |
| GET | /storage/signed-url/:key | Obtener URL firmada para ver foto/video (existente o nuevo) |

### 6.5 Checklist de seguridad

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /mechanic-checklist/items | Listar ítems del checklist (catálogo) |
| POST | /mechanic-checklist/items | Crear ítem (admin) |
| POST | /service-orders/:id/safety-checklist | Guardar respuestas del checklist (array de { itemId, status, notes?, photo? }) |
| GET | /service-orders/:id/safety-checklist | Obtener checklist completado |

---

## 7. Consideraciones Móvil

- **Responsive:** Los endpoints son REST; el frontend móvil (PWA, React Native, Flutter) consume la misma API.
- **Subida de fotos/video:** Multipart/form-data con `FileInterceptor` o `FilesInterceptor`. Límite de tamaño configurable (ej: 10 MB foto, 50 MB video).
- **URLs firmadas:** Para que el cliente vea fotos/videos sin autenticación compleja, usar `StorageService.getSignedUrl(key, expiresInSeconds)` con expiración corta (ej: 1 hora).
- **PWA:** Considerar service worker para uso offline de consulta (no de captura).

---

## 8. Migraciones Sugeridas

| # | Nombre | Tablas/Cambios |
|---|--------|----------------|
| 1 | AddReceptionPhotos | reception_photos |
| 2 | AddNotesToServiceOrderParts | ALTER service_order_parts ADD notes |
| 3 | AddServiceOrderUpdates | service_order_updates |
| 4 | AddServiceOrderFindings | service_order_findings |
| 5 | AddMechanicChecklistItems | mechanic_checklist_items |
| 6 | AddMechanicSafetyChecklists | mechanic_safety_checklists |

---

## 9. Resumen Ejecutivo

1. **Recepción:** Extender con `reception_photos` (fotos por ángulo). Km ya existe.
2. **Piezas cambiadas:** Agregar `notes` a service_order_parts.
3. **Seguimiento:** Nueva tabla `service_order_updates` para timeline.
4. **Cotización aparte:** `service_order_findings` con foto/video + notificación al cliente.
5. **Checklist de seguridad:** `mechanic_checklist_items` (catálogo) + `mechanic_safety_checklists` (respuestas). Ítems recomendados: llantas, balatas, amortiguadores, limpiaparabrisas, líquido de frenos, refrigerante, luces, batería.
6. **Móvil:** API REST; frontend móvil consume los mismos endpoints. Subida multipart para fotos/video.

---

*Documento generado para NexDMS. Ajustar según prioridades.*
