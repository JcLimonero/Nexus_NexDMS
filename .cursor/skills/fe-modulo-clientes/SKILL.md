---
name: fe-modulo-clientes
description: Implementa el módulo de Clientes en el frontend Angular de NexDMS. Usar cuando se pida implementar clientes, CRM clientes, o el módulo de clientes en la app web.
---

# Módulo Clientes — Frontend NexDMS

Guía para implementar el módulo de Clientes en `apps/web` (Angular 21, standalone, Bootstrap 5).

## Contexto del proyecto

- **API base:** `/api/v1` (proxy: `/api` → `http://localhost:3000`)
- **Auth:** `AuthInterceptor` añade `Authorization: Bearer <token>`
- **Ruta actual:** `/clientes` carga placeholder; debe reemplazarse por el módulo real

## API de Clientes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/clients` | Lista con filtros `search`, `clientType`, `page`, `limit` |
| GET | `/api/v1/clients/search?q=&limit=8` | Búsqueda rápida (<200ms) |
| GET | `/api/v1/clients/:id` | Detalle + contacts, vehicles, dataQuality |
| POST | `/api/v1/clients` | Crear cliente |
| PATCH | `/api/v1/clients/:id` | Actualizar |
| DELETE | `/api/v1/clients/:id` | Soft delete |

## Modelo de datos

```typescript
// client.model.ts
export enum ClientType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
}

export interface Client {
  id: string;
  tenantId: string;
  clientType: ClientType;
  isCompany: boolean;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  rfc: string | null;
  curp: string | null;
  taxRegime: string | null;
  taxPostalCode: string | null;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  fixedDiscount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDetail extends Client {
  contacts: Contact[];
  vehicles: CustomerVehicle[];
  dataQuality: { score: number; level: string; missing: string[] };
}
```

**Campos mínimos para crear:** `clientType`, `phone`. Para persona física: `firstName` o `lastName`. Para empresa: `companyName`.

## Estructura de archivos a crear

```
apps/web/src/app/
├── features/clientes/
│   ├── clientes.routes.ts
│   ├── clientes.service.ts
│   ├── models/
│   │   └── client.model.ts
│   ├── list/
│   │   ├── clientes-list.ts
│   │   ├── clientes-list.html
│   │   └── clientes-list.scss
│   ├── detail/
│   │   ├── cliente-detail.ts
│   │   ├── cliente-detail.html
│   │   └── cliente-detail.scss
│   └── form/
│       ├── cliente-form.ts
│       ├── cliente-form.html
│       └── cliente-form.scss
```

## Checklist de implementación

### 1. Modelos y servicio
- [ ] Crear `client.model.ts` con interfaces y enum
- [ ] Crear `clientes.service.ts` con `HttpClient` inyectado
- [ ] Métodos: `getAll(filters)`, `search(q, limit)`, `getById(id)`, `create(dto)`, `update(id, dto)`, `delete(id)`
- [ ] URL base: `/api/v1/clients`

### 2. Rutas
- [ ] Crear `clientes.routes.ts` con rutas: `''` (list), `'nuevo'`, `':id'`, `':id/editar'`
- [ ] Actualizar `content-routes.ts`: cambiar loadChildren de placeholder a `clientes.routes`

### 3. Lista de clientes
- [ ] Tabla con: nombre/razón social, teléfono, tipo, email, acciones
- [ ] Búsqueda con debounce (300ms) usando `search` o `getAll` con filtro
- [ ] Filtro por tipo (INDIVIDUAL / BUSINESS)
- [ ] Paginación si la API la soporta
- [ ] Botón "Nuevo cliente" → `/clientes/nuevo`
- [ ] Acciones: Ver, Editar, Eliminar (con confirmación)

### 4. Formulario (crear/editar)
- [ ] ReactiveForms con validación
- [ ] Toggle persona física / empresa: campos condicionales
- [ ] Persona: firstName, lastName, phone, email, rfc, curp, address, city, state, taxRegime, taxPostalCode, fixedDiscount, notes
- [ ] Empresa: companyName, phone, rfc, taxRegime, taxPostalCode, address, fixedDiscount, notes
- [ ] Validación: phone requerido, email formato, RFC 12-13 caracteres
- [ ] Guardar → POST o PATCH según modo
- [ ] Toastr para éxito/error

### 5. Detalle de cliente
- [ ] Mostrar datos del cliente
- [ ] Secciones: Datos generales, Contactos, Vehículos, Score de calidad
- [ ] Score: barra o badge (Básico 0-39%, Parcial 40-69%, Operativo 70-89%, Completo 90-100%)
- [ ] Botones: Editar, Eliminar

### 6. Convenciones
- [ ] Componentes standalone con `imports` explícitos
- [ ] Usar `inject()` en lugar de constructor cuando aplique
- [ ] Estilos: Bootstrap 5 + SCSS del proyecto
- [ ] Textos en español
- [ ] `RouterModule` para navegación

## Referencias

- API docs: `docs/modules/clientes.md`
- Entity: `apps/api/src/modules/clients/entities/client.entity.ts`
- DTOs: `apps/api/src/modules/clients/dto/`
- Ejemplo de servicio con auth: `apps/web/src/app/auth/auth.service.ts`
- Ejemplo de lista: `apps/web/src/app/components/contact/contacts/`
