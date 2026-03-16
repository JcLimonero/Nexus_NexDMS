# Flujo de búsqueda de inventario — Guía para Frontend

Este documento describe el flujo sugerido para implementar la búsqueda de inventario (vehículos y refacciones) en el frontend, considerando la búsqueda local vs. a nivel de grupo.

---

## Contexto

La API soporta dos ámbitos de búsqueda:

| `searchScope` | Descripción |
|---------------|-------------|
| **`local`** (por defecto) | Solo la agencia actual del usuario |
| **`group`** | Todas las agencias del grupo (razón social) |

**Endpoints afectados:**
- `GET /api/v1/catalog-units` — inventario de vehículos
- `GET /api/v1/parts` — inventario de refacciones

---

## Flujo sugerido para el usuario

### 1. Búsqueda inicial (local)

- **Comportamiento:** Primera búsqueda sin `searchScope` o con `searchScope=local`.
- **UX:** El usuario busca normalmente; ve solo resultados de su agencia.
- **Request:** `GET /api/v1/catalog-units?search=Honda` o `GET /api/v1/parts?search=aceite`

### 2. Expandir a otras agencias

- **Trigger:** Cuando no hay resultados o el usuario quiere ver si otra agencia tiene el ítem.
- **UX sugerida:**
  - Mensaje tipo: *"No encontramos resultados en tu agencia. ¿Buscar en otras agencias del grupo?"*
  - Botón/switch: *"Buscar en otras agencias"* o *"Ver disponibilidad en el grupo"*
- **Request:** Misma búsqueda + `searchScope=group`
  - Ejemplo: `GET /api/v1/catalog-units?search=Honda&searchScope=group`

### 3. Mostrar resultados a nivel grupo

- **Importante:** Cada ítem incluye `branchId` en la respuesta.
- **UX:** Mostrar en qué agencia está disponible cada ítem (nombre de sucursal).
- **Consideración:** Si el usuario tiene acceso a múltiples sucursales, podría mostrar un selector de sucursal para filtrar por `branchId` explícito.

---

## Wireframe de flujo (referencia)

```
┌─────────────────────────────────────────────────────────────┐
│  Buscar vehículo / refacción                                 │
│  ┌─────────────────────────────────────┐  [Buscar]          │
│  │ Honda Civic                          │                    │
│  └─────────────────────────────────────┘                    │
│                                                              │
│  ☐ Buscar en otras agencias del grupo                        │
│    (desmarcado = solo mi agencia; marcado = todo el grupo)   │
└─────────────────────────────────────────────────────────────┘

Resultados:
┌─────────────────────────────────────────────────────────────┐
│ Honda Civic 2024 - $350,000                    Sucursal Norte │
│ Honda Accord 2023 - $320,000                    Sucursal Sur │
└─────────────────────────────────────────────────────────────┘
```

---

## Parámetros de query

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `searchScope` | `'local' \| 'group'` | Ámbito de búsqueda. Por defecto: local |
| `branchId` | UUID | Filtro explícito por sucursal (opcional) |
| `search` | string | Término de búsqueda |
| *(otros)* | — | Según DTO de cada endpoint |

---

## Consideraciones de implementación

1. **Estado del toggle:** Guardar preferencia del usuario (local vs. group) durante la sesión si aplica.
2. **Cache:** Si el usuario alterna entre local/group, considerar cachear resultados por ámbito.
3. **Permisos:** La API valida el scope del usuario; usuarios SUCURSAL solo ven su legal entity en modo group.
4. **Transfers:** Si el ítem está en otra agencia, el flujo de transferencia entre sucursales es independiente (ver módulo de transferencias).

---

## Ejemplo de integración (pseudocódigo)

```typescript
// Estado
const [searchScope, setSearchScope] = useState<'local' | 'group'>('local');
const [searchTerm, setSearchTerm] = useState('');

// Fetch
const params = new URLSearchParams({
  search: searchTerm,
  ...(searchScope === 'group' && { searchScope: 'group' }),
});
const res = await api.get(`/catalog-units?${params}`);

// UI: mostrar branchId → nombre de sucursal (mapear con lista de branches)
```
