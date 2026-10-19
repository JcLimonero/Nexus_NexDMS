# Documentación técnica — NexDMS (Nexus_NexDMS)

Esta carpeta complementa la documentación existente en `docs/` (por ejemplo `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/modules/*` y los `PLAN_*.md`). No la reemplaza: resume el estado observado del código en la rama `main` y enlaza a lo que ya existe.

## Índice

| Documento | Contenido |
|-----------|-----------|
| [arquitectura.md](arquitectura.md) | Componentes, capas, dependencias externas, diagramas Mermaid |
| [workflows.md](workflows.md) | Flujos de negocio, trabajos programados, colas, build/despliegue |
| [codigo.md](codigo.md) | Estructura de carpetas, módulos, endpoints, modelos, variables de entorno |

Documentación previa relacionada: `README.md` (raíz), `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/CODING_STANDARDS.md`, `docs/modules/`, `apps/api/README.md`.

## Visión general

NexDMS (también llamado NexQS en algunos textos y en el título de Swagger) es un DMS (Dealer Management System) SaaS multi-tenant para grupos automotrices (motos y autos), desarrollado por Nexus Q Tech. Cubre clientes, catálogo de vehículos, inventario de refacciones y unidades, compras, almacén, caja/ventas, cotizaciones, taller (órdenes de servicio, recepción, hojalatería), garantías, facturación CFDI, comisiones, portal de cliente y administración SaaS.

## Stack (según `package.json` y Dockerfiles)

- API: NestJS 11, TypeORM, PostgreSQL, Redis, BullMQ, Passport/JWT, Swagger, Helmet, Throttler.
- Frontends: Angular 21 (cuatro apps: `web`, `admin`, `pwa`, `recepcion`) más una landing estática (`apps/landing`).
- Almacenamiento de archivos: Backblaze B2 (API compatible con S3).
- Contenedores: Docker / Docker Compose, Nginx. Imágenes base `node:20-alpine`.
- Despliegue observado: Render (API, vía `render.yaml`) y Vercel (frontends, vía `vercel.json`), además de un `docker-compose.prod.yml` para VPS.

> Nota: el README raíz menciona Angular 17+ y NestJS 10+, pero los `package.json` actuales declaran Angular `^21` y NestJS `^11`. Se documentan las versiones de los `package.json`.

## Cómo correrlo localmente

### Con Docker (flujo del README raíz)

```bash
cp apps/api/.env.example apps/api/.env   # completar los valores (ver codigo.md)
docker-compose up -d
docker-compose ps
```

El servicio `api` ejecuta `npm run build && npm run migration:run && npm run start:dev` al arrancar.

Puertos publicados en `docker-compose.yml`:

| Servicio | Puerto host |
|----------|-------------|
| PostgreSQL | 5433 |
| Redis | 6379 |
| API | 3010 (el contenedor escucha en 3000) |
| web | 4200 |
| pwa | 4201 |
| admin | 4202 |
| recepcion | 4203 |

Swagger está en `/api/docs` cuando `NODE_ENV` no es `production`; el prefijo global de la API es `api/v1`.

> Por confirmar: el README raíz indica la API en `localhost:3000`, pero `docker-compose.yml` la publica en el 3010.

### Sin Docker

Scripts del `package.json` raíz: `npm run api:dev`, `web:dev`, `pwa:dev`, `admin:dev`, `dev` (API + web con `concurrently`), `api:migration:run`, etc. Hay equivalentes en `Makefile` (`make db-up` levanta solo Postgres y Redis). Los dev servers Angular proxean `/api` a `http://localhost:3000` (o a `PROXY_API_TARGET`).

### Pruebas

`apps/api`: `npm test` (Jest) y `npm run test:e2e`. `npm run validate` (raíz) ejecuta `scripts/validate-implementation.sh`.
