# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NexDMS — multi-tenant DMS SaaS for Mexican automotive dealer groups (motorcycles and cars), built by Nexus Q Tech. Monorepo with a NestJS API and four Angular frontends.

## Monorepo layout

```
apps/
  api/         NestJS API (api.nexdms.com)      → localhost:3000 (host, or :3010 via Docker)
  web/         Angular — operator app (app.nexdms.com)   → localhost:4200
  pwa/         Angular PWA — mechanic app (pwa.nexdms.com) → localhost:4201
  admin/       Angular — Nexus Q Tech superadmin (admin.nexdms.com) → localhost:4202
  recepcion/   Angular — reception/front-desk app
docs/          Architecture and per-module specs — read before implementing a module
.cursor/rules/   Cursor rule files (apply even when working as Claude)
.cursor/skills/  Multi-agent Plan→Execute→Validate skill flows for specific modules
```

## Commands

Root-level (`package.json`):
```bash
npm run dev              # api + web concurrently
npm run api:dev          # apps/api start:dev
npm run web:dev          # apps/web ng serve
npm run pwa:dev / admin:dev
npm run api:build
npm run api:migration:generate -- src/database/migrations/NombreMigration
npm run api:migration:run
npm run api:migration:revert
```

`apps/api`:
```bash
npm run start:dev        # watch mode
npm run build
npm run lint             # eslint --fix
npm run test             # jest unit tests (*.spec.ts, rootDir: src)
npm run test -- <path>   # single test file, e.g. npm run test -- clients.service.spec.ts
npm run test:watch
npm run test:cov
npm run test:e2e         # jest --config ./test/jest-e2e.json (test/*.e2e-spec.ts)
npm run migration:generate -d dist/config/database.config.js
npm run migration:run
npm run migration:revert
npm run seed / seed:operativo / seed:mechanic-checklist
```

`apps/web`, `apps/pwa`, `apps/admin`, `apps/recepcion`:
```bash
npm start                # ng serve
npm run build
npm test                 # ng test (Karma + Jasmine)
```
`apps/web` additionally has `npm run lint` / `lint:fix` (eslint on .ts/.html) and `npm run format`.

Docker (full stack, all services depend on postgres/redis healthchecks; api runs build+migrate+start:dev on container start):
```bash
docker-compose up -d
docker-compose logs -f api
docker-compose exec api npm run migration:run
docker-compose exec postgres psql -U nexdms -d nexdms
docker-compose up -d --build api
```

Makefile shortcuts also exist (`api-dev`, `api-build`, `migration-generate name=X`, `migration-run`, `migration-revert`, `db-up`, `db-down`).

## Architecture

Read `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/CODING_STANDARDS.md` before implementing any module — they're the canonical reference. Per-module specs live in `docs/modules/`.

**Org hierarchy:** `Tenant (dealer group) → Marca/Brand → Sucursal/Branch → operational users`.

**Multi-tenancy:** single database, shared schema, discriminated by `tenant_id` on every row. JWT payload carries `{ tenantId, sucursalId, marcaId, rol, scope }`. Request flow: `AuthGuard` populates `request.user` → `ScopeGuard`/service-level filtering applies visibility by `scope`:
- `SUCURSAL`/`BRANCH` → only that branch's data
- `MARCA`/`BRAND` → all branches under that brand
- `GLOBAL` → all data for the tenant

Every service method that lists/reads data must filter by `tenantId` first, then apply the scope switch, mirroring the pattern in `docs/CODING_STANDARDS.md` (`TallerService.findAll`).

**API module layout** (`apps/api/src/modules/*`): one directory per domain (e.g. `clients`, `service-orders`, `catalog-units`, `stock-locations`, `unit-sales`, `cfdi`, `notifications`, `superadmin-audit`...) each with `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `entities/`. Cross-cutting code lives in `apps/api/src/common/` (guards, interceptors, decorators, filters, idempotency, throttler, redis, storage, data-quality, encryption) and `apps/api/src/shared/`.

**Naming convention — English, not Spanish:** despite some example code in `docs/CODING_STANDARDS.md` using Spanish identifiers, the actual codebase and `.cursor/rules/typeorm-naming.mdc` require English for TypeORM tables/columns/enums (`clients` not `clientes`, `tenant_id`/`branch_id`/`brand_id`, `first_name`/`last_name`, roles `ADMIN/MANAGER/WAREHOUSE/CASHIER/MECHANIC/SELLER`, scopes `GLOBAL/BRAND/BRANCH`). Follow the real module names under `apps/api/src/modules/` as the source of truth over the doc's Spanish examples. camelCase for TS entity properties (`branchId`, `firstName`).

**Web frontend** (`apps/web/src/app`): standalone Angular 21 components, Signals for state (no NgRx), `features/` holds one directory per business module (`clientes`, `taller`, `inventario-refacciones`, `caja-ventas`, `cfdi`, `citas-ventas`, ...), plus `auth/`, `components/`, `pages/`, `shared/`, `ui/`. API calls go through `/api/v1` (dev proxy `/api` → `http://localhost:3000`), auth via `AuthInterceptor` adding `Authorization: Bearer`.

**pwa/admin/recepcion frontends**: Angular standalone + Bootstrap 5 (not Material/Tailwind like `web`), smaller/single-purpose apps.

**Domain events** (`@nestjs/event-emitter`): domain actions emit events (`VentaConfirmadaEvent`, `OsEstatusChangedEvent`, `CfdiGeneradoEvent`, `StockMinimoEvent`, etc.) consumed by listeners (`InventarioListener`, `ComisionesListener`, `NotifListener`) — see the event table in `docs/ARCHITECTURE.md` for the full map before adding a new side effect to a domain action.

**Sensitive fields must be encrypted** with `EncryptionService` (AES-256-CBC, key from `ENCRYPTION_KEY`) before persisting: WhatsApp credentials and FacturAPI key in `sucursal_config`/branch config, and `users.totp_secret`. Never log decrypted values; superadmin audit log (`superadmin_audit_log`) must only store non-sensitive metadata about config changes.

**External integrations:** FacturAPI (CFDI, one org per branch/RFC), Backblaze B2 (S3-compatible storage for documents/logos), Meta WhatsApp (per-branch credentials), Resend (email), Twilio (SMS fallback), qz-tray/escpos (thermal printing).

**Deploy:** API on Render (`render.yaml`, migrations run on each deploy via startCommand), `web` on Vercel (`vercel.json`, proxies `/api/*` to the Render API), other frontends have their own `vercel.json`/Dockerfile. Production stack also deployable via `docker-compose.prod.yml`.

## Cursor rules and skills (also apply to Claude Code)

- `.cursor/rules/typeorm-naming.mdc` — English names for TypeORM tables/columns/enums (see above).
- `.cursor/rules/fe-componentes-formularios.mdc` — new form controls in `apps/web` should match the styles in `apps/web/src/app/features/clientes/form/cliente-form.scss` (CSS var tokens, exact input/select/textarea dimensions).
- `.cursor/rules/inventario-planificador.mdc` / `inventario-ejecutor.mdc` / `inventario-validador.mdc` — three-agent Plan→Execute→Validate flow specifically for the `inventario-refacciones` module (writes/reads `docs/PLAN_INVENTARIO_REFACCIONES.md` and `docs/ERRORES_VALIDACION.md`).
- `.cursor/skills/fe-modulo-clientes/` — reference for the Clientes module's API contract and data model.
- `.cursor/skills/validate-combo-loading/` — audits that every dropdown/combo in `apps/web` loads from its real API (registry at `apps/web/src/app/shared/data/combo-registry.ts`); run via `npm run validate:combos`.
- `.cursor/skills/validate-english-naming-and-test/` — detects Spanish identifiers/routes in `apps/web/src` and runs Karma+Jasmine.
- `.cursor/skills/performance-testing/` — Lighthouse/Angular DevTools flow for diagnosing progressive slowdown when navigating between `apps/web` modules.
