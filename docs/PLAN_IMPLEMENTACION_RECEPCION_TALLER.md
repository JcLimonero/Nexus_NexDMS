# Plan de Implementación: Recepción y Taller Móvil

> Documento ejecutable para el Agente de Implementación. Basado en `docs/PLAN_RECEPCION_Y_TALLER_MOVIL.md`.

**Fecha:** 2025-03-16

---

## 1. Orden de Ejecución (Fases Secuenciales)

| Fase | Nombre | Dependencias | Descripción |
|------|--------|--------------|-------------|
| **1** | Migraciones base | — | Crear tablas: reception_photos, notes en service_order_parts, service_order_updates, service_order_findings, mechanic_checklist_items, mechanic_safety_checklists |
| **2** | Entidades y relaciones | Fase 1 | Crear entidades TypeORM y registrar en módulos |
| **3** | Recepción y fotos | Fase 2 | Endpoint multipart para subida de fotos por ángulo |
| **4** | Piezas con notas | Fase 2 | Extender AddPartDto, addPart, PATCH parts/:partId |
| **5** | Seguimiento (updates) | Fase 2 | CRUD service_order_updates, timeline |
| **6** | Hallazgos y cotización | Fase 2 | CRUD findings, evento servicio.hallazgo_cotizacion, notificación |
| **7** | Checklist de seguridad | Fase 2 | Módulo mechanic-checklist, endpoints, seed de ítems |
| **8** | URL firmada pública | Fase 6 | Endpoint GET /storage/signed-url/:key para evidencia |
| **9** | Seed mechanic_checklist_items | Fase 7 | Ítems básicos: llantas, balatas, amortiguadores, etc. |

**Orden recomendado de implementación:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

---

## 2. Lista de Migraciones (Orden)

| # | Timestamp | Nombre archivo | Tablas/Cambios |
|---|-----------|----------------|----------------|
| 1 | 1773647000000 | AddReceptionPhotos | `reception_photos` (id, reception_checklist_id, angle, storage_key, mime_type, created_at) |
| 2 | 1773647100000 | AddNotesToServiceOrderParts | `ALTER service_order_parts ADD notes text NULL` |
| 3 | 1773647200000 | AddServiceOrderUpdates | `service_order_updates` (id, service_order_id, user_id, status, message, created_at) |
| 4 | 1773647300000 | AddServiceOrderFindings | `service_order_findings` (id, service_order_id, user_id, description, requires_quotation, media_type, media_key, client_notified_at, created_at) |
| 5 | 1773647400000 | AddMechanicChecklistItems | `mechanic_checklist_items` (id, tenant_id, code, name, description, is_required, sort_order) |
| 6 | 1773647500000 | AddMechanicSafetyChecklists | `mechanic_safety_checklists` (id, service_order_id, item_id, user_id, status, notes, photo_key, created_at) |

### Detalle de cada migración

#### 2.1 AddReceptionPhotos (1773647000000)
```sql
CREATE TABLE "reception_photos" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "reception_checklist_id" uuid NOT NULL,
  "angle" varchar(20) NOT NULL,
  "storage_key" varchar(500) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_reception_photos" PRIMARY KEY ("id"),
  CONSTRAINT "FK_reception_photos_checklist" FOREIGN KEY ("reception_checklist_id") REFERENCES "reception_checklists"("id") ON DELETE CASCADE
);
CREATE INDEX "IDX_reception_photos_checklist" ON "reception_photos" ("reception_checklist_id");
```
**Ángulos permitidos:** FRONT, REAR, LEFT_SIDE, RIGHT_SIDE, INTERIOR, DASHBOARD, TRUNK, ENGINE, WHEELS, OTHER

#### 2.2 AddNotesToServiceOrderParts (1773647100000)
```sql
ALTER TABLE "service_order_parts" ADD COLUMN "notes" text NULL;
```

#### 2.3 AddServiceOrderUpdates (1773647200000)
```sql
CREATE TABLE "service_order_updates" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "service_order_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "status" varchar(50) NULL,
  "message" text NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_service_order_updates" PRIMARY KEY ("id"),
  CONSTRAINT "FK_service_order_updates_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_service_order_updates_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION
);
CREATE INDEX "IDX_service_order_updates_service_order" ON "service_order_updates" ("service_order_id");
CREATE INDEX "IDX_service_order_updates_created_at" ON "service_order_updates" ("created_at");
```

#### 2.4 AddServiceOrderFindings (1773647300000)
```sql
CREATE TYPE "service_order_findings_media_type_enum" AS ENUM ('PHOTO', 'VIDEO');

CREATE TABLE "service_order_findings" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "service_order_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "description" text NOT NULL,
  "requires_quotation" boolean NOT NULL DEFAULT true,
  "media_type" "service_order_findings_media_type_enum" NOT NULL,
  "media_key" varchar(500) NOT NULL,
  "client_notified_at" TIMESTAMP NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_service_order_findings" PRIMARY KEY ("id"),
  CONSTRAINT "FK_service_order_findings_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_service_order_findings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION
);
CREATE INDEX "IDX_service_order_findings_service_order" ON "service_order_findings" ("service_order_id");
```

#### 2.5 AddMechanicChecklistItems (1773647400000)
```sql
CREATE TABLE "mechanic_checklist_items" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "tenant_id" uuid NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" text NULL,
  "is_required" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  CONSTRAINT "PK_mechanic_checklist_items" PRIMARY KEY ("id"),
  CONSTRAINT "FK_mechanic_checklist_items_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "IDX_mechanic_checklist_items_tenant" ON "mechanic_checklist_items" ("tenant_id");
```

#### 2.6 AddMechanicSafetyChecklists (1773647500000)
```sql
CREATE TYPE "mechanic_safety_checklists_status_enum" AS ENUM ('BUENO', 'REGULAR', 'MALO', 'REEMPLAZAR', 'OK', 'FALLA');

CREATE TABLE "mechanic_safety_checklists" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "service_order_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "status" "mechanic_safety_checklists_status_enum" NOT NULL,
  "notes" text NULL,
  "photo_key" varchar(500) NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_mechanic_safety_checklists" PRIMARY KEY ("id"),
  CONSTRAINT "FK_mechanic_safety_checklists_service_order" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_mechanic_safety_checklists_item" FOREIGN KEY ("item_id") REFERENCES "mechanic_checklist_items"("id") ON DELETE NO ACTION,
  CONSTRAINT "FK_mechanic_safety_checklists_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION,
  CONSTRAINT "UQ_mechanic_safety_checklists_os_item" UNIQUE ("service_order_id", "item_id")
);
CREATE INDEX "IDX_mechanic_safety_checklists_service_order" ON "mechanic_safety_checklists" ("service_order_id");
```

---

## 3. Lista de Archivos a Crear

### 3.1 Migraciones
| Ruta |
|------|
| `apps/api/src/database/migrations/1773647000000-AddReceptionPhotos.ts` |
| `apps/api/src/database/migrations/1773647100000-AddNotesToServiceOrderParts.ts` |
| `apps/api/src/database/migrations/1773647200000-AddServiceOrderUpdates.ts` |
| `apps/api/src/database/migrations/1773647300000-AddServiceOrderFindings.ts` |
| `apps/api/src/database/migrations/1773647400000-AddMechanicChecklistItems.ts` |
| `apps/api/src/database/migrations/1773647500000-AddMechanicSafetyChecklists.ts` |

### 3.2 Entidades
| Ruta |
|------|
| `apps/api/src/modules/service-orders/entities/reception-photo.entity.ts` |
| `apps/api/src/modules/service-orders/entities/service-order-update.entity.ts` |
| `apps/api/src/modules/service-orders/entities/service-order-finding.entity.ts` |
| `apps/api/src/modules/mechanic-checklist/entities/mechanic-checklist-item.entity.ts` |
| `apps/api/src/modules/mechanic-checklist/entities/mechanic-safety-checklist.entity.ts` |

### 3.3 DTOs
| Ruta |
|------|
| `apps/api/src/modules/service-orders/dto/upload-reception-photo.dto.ts` |
| `apps/api/src/modules/service-orders/dto/create-update.dto.ts` |
| `apps/api/src/modules/service-orders/dto/create-finding.dto.ts` |
| `apps/api/src/modules/service-orders/dto/update-part-notes.dto.ts` |
| `apps/api/src/modules/mechanic-checklist/dto/create-checklist-item.dto.ts` |
| `apps/api/src/modules/mechanic-checklist/dto/save-safety-checklist.dto.ts` |

### 3.4 Módulo mechanic-checklist
| Ruta |
|------|
| `apps/api/src/modules/mechanic-checklist/mechanic-checklist.module.ts` |
| `apps/api/src/modules/mechanic-checklist/mechanic-checklist.service.ts` |
| `apps/api/src/modules/mechanic-checklist/mechanic-checklist.controller.ts` |

### 3.5 Storage (endpoint URL firmada)
| Ruta |
|------|
| `apps/api/src/common/storage/storage.controller.ts` (agregar al módulo existente) |

### 3.6 Evento y listener
| Ruta |
|------|
| (Modificar) `apps/api/src/events/domain-events.ts` — agregar `ServicioHallazgoCotizacionEvent` |
| (Modificar) `apps/api/src/modules/notifications/listeners/notifications.listener.ts` — agregar `@OnEvent('servicio.hallazgo_cotizacion')` |

### 3.7 Seed
| Ruta |
|------|
| `apps/api/src/database/seeds/mechanic-checklist-items.seed.ts` |

---

## 4. Lista de Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `apps/api/src/modules/service-orders/entities/reception-checklist.entity.ts` | Agregar relación `@OneToMany(() => ReceptionPhoto, ...) photos` |
| `apps/api/src/modules/service-orders/entities/service-order.entity.ts` | Agregar relaciones: `updates`, `findings` |
| `apps/api/src/modules/service-orders/entities/service-order-part.entity.ts` | Agregar columna `notes` (text, nullable) |
| `apps/api/src/modules/service-orders/dto/add-part.dto.ts` | Agregar `@IsOptional() @IsString() notes?: string` |
| `apps/api/src/modules/service-orders/service-orders.service.ts` | Métodos: `uploadReceptionPhoto`, `addUpdate`, `getUpdates`, `createFinding`, `getFindings`, `updatePartNotes`; en `addPart` pasar `notes`; inyectar `ReceptionPhoto`, `ServiceOrderUpdate`, `ServiceOrderFinding`, `StorageService`, `EventEmitter2` |
| `apps/api/src/modules/service-orders/service-orders.controller.ts` | Endpoints: POST `:id/checklist/photos` (FileInterceptor), PATCH `:id/parts/:partId`, POST `:id/updates`, GET `:id/updates`, POST `:id/findings` (FileInterceptor), GET `:id/findings` |
| `apps/api/src/modules/service-orders/service-orders.module.ts` | Importar `ReceptionPhoto`, `ServiceOrderUpdate`, `ServiceOrderFinding`; `StorageModule`; `EventEmitterModule` |
| `apps/api/src/events/domain-events.ts` | Agregar clase `ServicioHallazgoCotizacionEvent` |
| `apps/api/src/modules/notifications/listeners/notifications.listener.ts` | Agregar handler `onServicioHallazgoCotizacion` con `@OnEvent('servicio.hallazgo_cotizacion')` |
| `apps/api/src/app.module.ts` | Importar `MechanicChecklistModule` |
| `apps/api/src/common/storage/storage.module.ts` | Agregar `StorageController` a controllers |
| `apps/api/src/database/seeds/run-seeds.ts` | Opcional: invocar seed de mechanic_checklist_items después de crear tenant/branch (o crear script separado `seed:mechanic-checklist`) |

---

## 5. Recomendaciones Técnicas

### 5.1 Multipart upload
- Usar `FileInterceptor('file')` para fotos de recepción y hallazgos.
- Para hallazgos con video: `FileInterceptor('file')` aceptando `image/jpeg`, `image/png`, `image/webp`, `video/mp4`.
- Validar MIME types en el servicio antes de subir.

### 5.2 Límites de tamaño
| Tipo | Límite sugerido | Variable de entorno |
|------|-----------------|---------------------|
| Foto recepción | 10 MB | `MAX_RECEPTION_PHOTO_SIZE_MB` (default 10) |
| Foto hallazgo | 10 MB | `MAX_FINDING_PHOTO_SIZE_MB` (default 10) |
| Video hallazgo | 50 MB | `MAX_FINDING_VIDEO_SIZE_MB` (default 50) |

### 5.3 Multer memory storage
- Usar `memoryStorage()` para que el archivo llegue como buffer (como en `documents.service.ts`).
- Configurar límite en `main.ts` o en el módulo: `app.use(bodyParser.json({ limit: '10mb' }))` si aplica; para multipart, Nest usa `multer` por defecto. Considerar `MulterModule` con `limits: { fileSize: 10 * 1024 * 1024 }` si se usa `MulterModule.register()`.

### 5.4 Rutas de storage (keys)
- Recepción: `service-orders/{serviceOrderId}/reception/{angle}_{timestamp}.{ext}`
- Hallazgos: `service-orders/{serviceOrderId}/findings/{findingId}_{timestamp}.{ext}`
- Checklist seguridad: `service-orders/{serviceOrderId}/safety-checklist/{itemId}_{timestamp}.{ext}`

### 5.5 URL firmada para cliente
- Endpoint `GET /api/v1/storage/signed-url/:key` con query `?expires=3600`.
- Validar que la key pertenezca a un recurso del tenant del usuario (o crear endpoint público con token temporal para cliente).
- Para notificación al cliente: generar URL con expiración de 24–48 h y enviarla en el mensaje.

### 5.6 Evento servicio.hallazgo_cotizacion
- Payload: `{ serviceOrderId, findingId, branchId, tenantId, description, mediaKey, mediaType, client: { email?, phone? } }`
- El listener debe obtener datos del cliente desde `ServiceOrder.owner` y enviar WhatsApp/email con mensaje tipo: "Hay un hallazgo en su unidad que requiere cotización. Ver evidencia: [URL firmada]".

### 5.7 Permisos por rol
| Endpoint | Roles |
|----------|-------|
| POST checklist/photos | SUPERADMIN, ADMIN, MANAGER, CASHIER |
| PATCH parts/:partId | SUPERADMIN, ADMIN, MANAGER, CASHIER, MECHANIC |
| POST/GET updates | SUPERADMIN, ADMIN, MANAGER, CASHIER, MECHANIC |
| POST/GET findings | SUPERADMIN, ADMIN, MANAGER, CASHIER, MECHANIC |
| GET/POST mechanic-checklist/items | SUPERADMIN, ADMIN, MANAGER (admin); MECHANIC (solo GET items) |
| POST/GET safety-checklist | SUPERADMIN, ADMIN, MANAGER, CASHIER, MECHANIC |

---

## 6. Checklist por Fase

### Fase 1: Migraciones
- [ ] Crear `1773647000000-AddReceptionPhotos.ts`
- [ ] Crear `1773647100000-AddNotesToServiceOrderParts.ts`
- [ ] Crear `1773647200000-AddServiceOrderUpdates.ts`
- [ ] Crear `1773647300000-AddServiceOrderFindings.ts`
- [ ] Crear `1773647400000-AddMechanicChecklistItems.ts`
- [ ] Crear `1773647500000-AddMechanicSafetyChecklists.ts`
- [ ] Ejecutar `npm run build` y `npm run migration:run`

### Fase 2: Entidades
- [ ] Crear `reception-photo.entity.ts`
- [ ] Crear `service-order-update.entity.ts`
- [ ] Crear `service-order-finding.entity.ts`
- [ ] Crear `mechanic-checklist-item.entity.ts`
- [ ] Crear `mechanic-safety-checklist.entity.ts`
- [ ] Modificar `reception-checklist.entity.ts` (relación photos)
- [ ] Modificar `service-order.entity.ts` (relaciones updates, findings)
- [ ] Modificar `service-order-part.entity.ts` (columna notes)
- [ ] Registrar entidades en `TypeOrmModule.forFeature` de los módulos correspondientes

### Fase 3: Recepción y fotos
- [ ] Crear `UploadReceptionPhotoDto` (angle: enum)
- [ ] Agregar método `uploadReceptionPhoto` en ServiceOrdersService
- [ ] Inyectar `ReceptionPhoto` repo y `StorageService`
- [ ] Endpoint POST `:id/checklist/photos` con `FileInterceptor('file')`
- [ ] Validar que exista checklist antes de subir
- [ ] Validar angle en enum (FRONT, REAR, LEFT_SIDE, RIGHT_SIDE, INTERIOR, DASHBOARD, TRUNK, ENGINE, WHEELS, OTHER)
- [ ] Modificar `findOne` para incluir `checklist.photos` en relations
- [ ] GET checklist debe devolver fotos agrupadas por ángulo

### Fase 4: Piezas con notas
- [ ] Modificar `AddPartDto`: agregar `notes?: string`
- [ ] Modificar `addPart` en service: pasar `notes` al crear ServiceOrderPart
- [ ] Crear `UpdatePartNotesDto` con `notes?: string`
- [ ] Crear método `updatePartNotes` en ServiceOrdersService
- [ ] Endpoint PATCH `:id/parts/:partId` con body `{ notes }`

### Fase 5: Seguimiento (updates)
- [ ] Crear `CreateUpdateDto` (message: string, status?: string)
- [ ] Crear método `addUpdate` en ServiceOrdersService
- [ ] Crear método `getUpdates` en ServiceOrdersService (ordenado por created_at DESC)
- [ ] Endpoint POST `:id/updates`
- [ ] Endpoint GET `:id/updates`
- [ ] Inyectar `ServiceOrderUpdate` repo

### Fase 6: Hallazgos y cotización
- [ ] Crear `CreateFindingDto` (description, requiresQuotation, file vía multipart)
- [ ] Crear entidad `ServiceOrderFinding`
- [ ] Crear método `createFinding` en ServiceOrdersService (subir file, guardar finding)
- [ ] Si `requiresQuotation` y `media_key`: emitir `servicio.hallazgo_cotizacion`
- [ ] Crear `ServicioHallazgoCotizacionEvent` en domain-events.ts
- [ ] Agregar `@OnEvent('servicio.hallazgo_cotizacion')` en NotificationsListener
- [ ] Listener: obtener cliente de OS, generar URL firmada, enviar WhatsApp/email
- [ ] Marcar `client_notified_at` después de enviar
- [ ] Endpoint POST `:id/findings` (multipart: file + description + requiresQuotation)
- [ ] Endpoint GET `:id/findings`
- [ ] Registrar template WhatsApp `hallazgo_cotizacion` (o usar html/text genérico)

### Fase 7: Checklist de seguridad
- [ ] Crear módulo `MechanicChecklistModule`
- [ ] Crear `MechanicChecklistService` (findItems, createItem, saveSafetyChecklist, getSafetyChecklist)
- [ ] Crear `MechanicChecklistController`
- [ ] GET `/mechanic-checklist/items` (por tenant)
- [ ] POST `/mechanic-checklist/items` (admin, crear ítem)
- [ ] POST `/service-orders/:id/safety-checklist` (body: array de { itemId, status, notes?, photo? })
- [ ] GET `/service-orders/:id/safety-checklist`
- [ ] Integrar en ServiceOrdersModule o crear rutas en controller de service-orders

### Fase 8: URL firmada
- [ ] Crear `apps/api/src/common/storage/storage.controller.ts` con GET `/storage/signed-url/:key?expires=3600`
- [ ] Validar que el usuario tenga acceso al recurso (key debe contener tenant/service_order del scope del usuario)
- [ ] Alternativa: endpoint público con token JWT corto para cliente (link en notificación)

### Fase 9: Seed mechanic_checklist_items
- [ ] Crear `mechanic-checklist-items.seed.ts`
- [ ] Ítems: TIRES (Desgaste de llantas), BRAKES (Balatas), SHOCKS (Amortiguadores), WIPERS (Limpiaparabrisas), BRAKE_FLUID (Líquido de frenos), COOLANT (Refrigerante), LIGHTS (Luces), BATTERY (Batería), TIMING_BELT (Correa de distribución), AIR_FILTER (Filtro de aire), SUSPENSION (Suspensión), EXHAUST (Escape), OIL_LEVEL (Nivel de aceite)
- [ ] Valores: code, name, description, is_required, sort_order
- [ ] Ejecutar para cada tenant existente (o solo demo)
- [ ] Agregar script `seed:mechanic-checklist` en package.json

---

## 7. Seed de Ítems del Checklist (Detalle)

```typescript
const ITEMS = [
  { code: 'TIRES', name: 'Desgaste de llantas', description: 'Profundidad del dibujo, estado general', isRequired: true, sortOrder: 1 },
  { code: 'BRAKES', name: 'Balatas (frenos)', description: 'Estado de pastillas/discos', isRequired: true, sortOrder: 2 },
  { code: 'SHOCKS', name: 'Amortiguadores', description: 'Fugas, rebote, estabilidad', isRequired: true, sortOrder: 3 },
  { code: 'WIPERS', name: 'Limpiaparabrisas', description: 'Estado de plumillas', isRequired: true, sortOrder: 4 },
  { code: 'BRAKE_FLUID', name: 'Líquido de frenos', description: 'Nivel y estado', isRequired: true, sortOrder: 5 },
  { code: 'COOLANT', name: 'Refrigerante', description: 'Nivel y estado', isRequired: true, sortOrder: 6 },
  { code: 'LIGHTS', name: 'Luces', description: 'Frontales, traseras, direccionales, stop', isRequired: true, sortOrder: 7 },
  { code: 'BATTERY', name: 'Batería', description: 'Voltaje/estado si se mide', isRequired: true, sortOrder: 8 },
  { code: 'TIMING_BELT', name: 'Correa de distribución', description: 'Estado, kilometraje desde último cambio', isRequired: false, sortOrder: 9 },
  { code: 'AIR_FILTER', name: 'Filtro de aire', description: 'Estado', isRequired: false, sortOrder: 10 },
  { code: 'SUSPENSION', name: 'Suspensión (rotulas, terminales)', description: 'Juego, desgaste', isRequired: false, sortOrder: 11 },
  { code: 'EXHAUST', name: 'Escape', description: 'Fugas, soportes', isRequired: false, sortOrder: 12 },
  { code: 'OIL_LEVEL', name: 'Nivel de aceite', description: 'Verificación', isRequired: false, sortOrder: 13 },
];
```

---

## 8. Endpoints Resumen

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /service-orders/:id/checklist/photos | Subir foto por ángulo (multipart: file, angle) |
| GET | /service-orders/:id/checklist | Obtener checklist con fotos por ángulo |
| PATCH | /service-orders/:id/parts/:partId | Actualizar notas de pieza |
| POST | /service-orders/:id/updates | Agregar actualización (message, status opcional) |
| GET | /service-orders/:id/updates | Listar actualizaciones (timeline) |
| POST | /service-orders/:id/findings | Crear hallazgo (multipart: file, description, requiresQuotation) |
| GET | /service-orders/:id/findings | Listar hallazgos |
| GET | /mechanic-checklist/items | Listar ítems del catálogo |
| POST | /mechanic-checklist/items | Crear ítem (admin) |
| POST | /service-orders/:id/safety-checklist | Guardar respuestas del checklist |
| GET | /service-orders/:id/safety-checklist | Obtener checklist completado |
| GET | /storage/signed-url/:key | Obtener URL firmada (query: expires) |

---

## 9. Dependencias entre Módulos

```
ServiceOrdersModule
  ├── StorageModule (para upload y signed URL)
  ├── EventEmitterModule (para servicio.hallazgo_cotizacion)
  └── Entidades: ReceptionPhoto, ServiceOrderUpdate, ServiceOrderFinding

MechanicChecklistModule
  ├── TypeOrmModule: MechanicChecklistItem, MechanicSafetyChecklist
  └── StorageModule (para photo_key en safety checklist)

common/storage/StorageModule (existente)
  └── Agregar StorageController para GET /storage/signed-url/:key
```

---

*Documento listo para ejecución por el Agente de Implementación.*
