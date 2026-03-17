# Plan de Implementación — Documentos de Recompra

## Objetivo
Permitir adjuntar documentos al expediente de una recompra (unidad seminueva). Incluye documentos del vendedor y del estado legal de la unidad, para tener trazabilidad completa en el expediente.

## Tipos de documento

### Del vendedor
| Código | Descripción |
|--------|-------------|
| INE | Identificación oficial (INE/IFE) |
| COMPROBANTE_DOMICILIO | Comprobante de domicilio |
| PODER_NOTARIAL | Poder notarial (si vende representando a tercero) |
| RFC | Cédula de identificación fiscal |

### Estado legal de la unidad
| Código | Descripción |
|--------|-------------|
| FACTURA_ORIGINAL | Factura original de compra |
| LIBERACION_ADEUDO | Liberación de adeudo (financiamiento, prenda) |
| TARJETA_CIRCULACION | Tarjeta de circulación |
| TENENCIA | Comprobante de tenencia |
| PLACA | Fotografía o documento de placas |

## Orden de implementación

### 1. API — Migración y entidad

- [ ] **Migración**: Crear tabla `unit_return_documents` (referencia: `AddClientDocuments`, `ClientDocumentValidation`)
  - `id` uuid PK, `tenant_id`, `unit_return_id` (FK → unit_returns ON DELETE CASCADE)
  - `document_type` varchar(50)
  - `name` varchar(200), `storage_key` varchar(500), `mime_type` varchar(100), `size_bytes` int
  - `status` enum (PENDING, APPROVED, REJECTED), `validated_at`, `validated_by` (FK → users), `rejection_reason` varchar(500)
  - `created_at`
  - Índices: tenant_id, unit_return_id, document_type, status

- [ ] **Entidad UnitReturnDocument**: Similar a `ClientDocument`, FK a `UnitReturn`

### 2. API — Módulo Unit Return Documents

- [ ] `unit-return-documents.module.ts`
- [ ] `unit-return-documents.service.ts`:
  - `findAllByUnitReturn(unitReturnId)`
  - `upload(unitReturnId, documentType, file)`
  - `getDownloadUrl(unitReturnId, documentId)`
  - `delete(unitReturnId, documentId)`
  - `approve` / `reject` (opcional, como en client documents)
- [ ] `unit-return-documents.controller.ts`:
  - `GET /unit-returns/:unitReturnId/documents`
  - `POST /unit-returns/:unitReturnId/documents/upload`
  - `GET /unit-returns/:unitReturnId/documents/:documentId/download-url`
  - `DELETE /unit-returns/:unitReturnId/documents/:documentId`

### 3. API — Constantes de tipos

- [ ] Archivo `unit-return-document-types.ts` con lista de tipos y labels para el frontend (o endpoint GET /document-types/unit-return)

### 4. Frontend — Modelos y servicio

- [ ] `unit-return-document.model.ts` — UnitReturnDocument, tipos conocidos
- [ ] Métodos en `inventario-unidades.service.ts` o nuevo `unit-return-documents.service.ts`:
  - `getUnitReturnDocuments(unitReturnId)`
  - `uploadUnitReturnDocument(unitReturnId, documentType, file)`
  - `getUnitReturnDocumentDownloadUrl(unitReturnId, documentId)`
  - `deleteUnitReturnDocument(unitReturnId, documentId)`

### 5. Frontend — Flujo de recompra con documentos

**Opción A: Documentos después de crear recompra**
- [ ] Tras crear recompra, redirigir a `/inventario-unidades/:id/expediente` o similar
- [ ] Vista de expediente: lista de documentos requeridos + subida
- [ ] Checklist visual (documentos requeridos vs subidos)

**Opción B: Documentos en el mismo formulario**
- [ ] Formulario recompra: datos + sección "Documentos del expediente"
- [ ] Subida de archivos antes o después de guardar (si después: crear recompra primero, luego adjuntar)

**Recomendación**: Opción A — crear recompra, luego vista de expediente con subida de documentos. Más limpio y permite adjuntar documentos en cualquier momento.

### 6. Frontend — Componentes

- [ ] `unidades/expediente/expediente-recompra.ts` — vista del expediente de una unidad (historial de recompras + documentos por recompra)
- [ ] O integrar en `unidad-detail`: sección "Expedientes" que muestra cada UnitReturn con sus documentos
- [ ] Componente reutilizable `document-upload.ts` — subida de archivo con selector de tipo

### 7. Rutas y navegación

- [ ] Ruta `/inventario-unidades/:id/recompra/:returnId/expediente` para ver/adjuntar documentos de una recompra específica
- [ ] O: en detalle de unidad, al expandir historial, mostrar documentos por evento de tipo RETURN
- [ ] Enlace "Ver expediente" desde el historial cuando el evento es RETURN

## Estructura de archivos API

```
apps/api/src/modules/unit-return-documents/
├── unit-return-documents.module.ts
├── unit-return-documents.service.ts
├── unit-return-documents.controller.ts
├── entities/
│   └── unit-return-document.entity.ts
├── dto/
│   └── (si aplica)
└── constants/
    └── document-types.ts
```

## Estructura de archivos Frontend

```
apps/web/src/app/features/inventario-unidades/
├── modelos/
│   └── unit-return-document.model.ts
├── unidades/
│   ├── detail/
│   │   └── (añadir sección documentos en historial)
│   └── expediente/
│       ├── expediente-recompra.ts
│       ├── expediente-recompra.html
│       └── document-upload/ (componente reutilizable)
```

## Storage

- Ruta en S3/storage: `unit-returns/{unitReturnId}/documents/{timestamp}-{filename}`
- Reutilizar StorageService existente

## Dependencias

- UnitReturnsModule
- StorageModule
- BranchesModule (para validar acceso a la sucursal de la unidad)

## Convenciones

- Textos en español
- Tipos de documento en mayúsculas con guión bajo
- Toastr para feedback en subida/eliminación

---

## Recomendaciones implementadas (post-validación)

- [x] **Approve/Reject**: Métodos `approve` y `reject` en service y controller; botones en expediente-recompra
- [x] **Endpoint de tipos**: `GET /api/v1/document-types/unit-return` devuelve tipos y labels
- [x] **Validación documentType**: El backend valida contra `UNIT_RETURN_DOCUMENT_TYPES` en upload
- [x] **Lint**: Errores en unit-return-documents corregidos
