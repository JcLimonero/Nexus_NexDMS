---
name: validate-english-naming-and-test
description: >-
  Validates that variable names and route paths are in English in NexDMS.
  Renames Spanish identifiers to English and runs Karma + Jasmine UI tests.
  Use when asked to validate English naming, rename Spanish variables/routes,
  or run UI tests with Karma and Jasmine.
---

# Validate English Naming and Run UI Tests

Validates variables and routes are in English, renames when needed, and runs Karma + Jasmine tests in `apps/web` (Angular).

## Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   DETECTAR   │ ──► │   RENOMBRAR  │ ──► │    PROBAR    │
│ (buscar ES)  │     │ (a inglés)   │     │ (Karma+Jasmine)│
└──────────────┘     └──────────────┘     └──────────────┘
```

## Phase 1: Detect Spanish

**Scope:** `apps/web/src` (TypeScript, HTML, SCSS, routes).

### Variables to check

- `const` / `let` / `var` identifiers
- Function parameters
- Class properties and methods
- Interface/type property names
- Template variables (`#var`, `*ngFor="let x of y"`)

### Routes to check

- `path:` in route configs (`content-routes.ts`, `*.routes.ts`, `app.routes.ts`)
- `routerLink` and `router.navigate()` paths
- `path:` in nav.service or similar

### Spanish patterns

- Words: `cliente`, `catalogo`, `inventario`, `refacciones`, `unidades`, `compras`, `almacen`, `caja`, `ventas`, `cotizaciones`, `taller`, `garantias`, `configuracion`, `contactos`, `ordenes`, `tipos`, `combustion`, `ubicaciones`, `categorias`
- Path segments: `clientes`, `catalogo`, `inventario-refacciones`, `ordenes-compra`, `ordenes-servicio`, `tipos-vehiculo`, `tipos-combustion`

**Output:** Create `docs/SPANISH_NAMING_REPORT.md` with:
- File path, line, current name, suggested English name
- Categoría: variable | route | both

**Optional:** Run `node .cursor/skills/validate-english-naming-and-test/scripts/find-spanish-names.js` from project root to get a JSON list of potential Spanish identifiers as a starting point.

## Phase 2: Rename to English

**Mapping reference:** See [reference.md](reference.md) for Spanish → English mappings.

1. Read `docs/SPANISH_NAMING_REPORT.md`
2. Apply renames in this order:
   - Route paths first (affects router, links, redirects)
   - Route constants/variables
   - Service/component variables
   - Template variables
3. Update all references: imports, `routerLink`, `navigate()`, breadcrumbs in `data` (keep Spanish for UI labels if desired)
4. Run `npm run lint` and `npm run lint:fix` in apps/web
5. Delete `docs/SPANISH_NAMING_REPORT.md` when done

**Note:** `data.breadcrumb` can stay in Spanish (user-facing). Only `path` and code identifiers must be English.

## Phase 3: Run UI Tests (Karma + Jasmine)

1. Ensure tests exist: `apps/web/src/**/*.spec.ts`
2. Run: `cd apps/web && npm test` (or `ng test`)
3. If no spec files exist:
   - Create basic smoke tests for critical components (see [reference.md](reference.md))
   - Run `ng test` again
4. Fix any failing tests from the renames
5. Report: "Tests passed" or list failures

## Usage

- "Valida que variables y rutas estén en inglés y renómbralas"
- "Revisa nombres en español, renómbralos a inglés y ejecuta tests Karma"
- "Valida naming en inglés y corre pruebas de UI con Jasmine"
