# NexDMS — Dealer Management System

SaaS para grupos automotrices mexicanos (motos y autos).
Desarrollado por **Nexus Q Tech**.

---

## Stack

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Backend    | NestJS 10+ · TypeScript 5+         |
| Frontend   | Angular 17+ · Material · Tailwind   |
| Base de datos | PostgreSQL 15+                   |
| Caché/Queue | Redis 7+ · Bull                   |
| Storage    | Backblaze B2                        |
| Infra      | Docker · Nginx · GitHub Actions     |

---

## Estructura del monorepo

```
nexdms/
├── apps/
│   ├── api/      ← NestJS API (api.nexdms.com)
│   ├── web/      ← Angular operadores (app.nexdms.com)
│   ├── pwa/      ← Angular PWA mecánico (pwa.nexdms.com)
│   └── admin/    ← Angular superadmin (admin.nexdms.com)
├── docs/         ← Documentación de arquitectura y módulos
├── nginx/        ← Configuración de Nginx
├── scripts/      ← Scripts de DB y backup
└── .github/      ← CI/CD pipelines
```

---

## Setup local con Docker

### 1. Prerrequisitos
- Docker Desktop instalado y corriendo
- Git

### 2. Clonar el repo
```bash
git clone https://github.com/JcLimonero/Nexus_NexDMS.git nexdms
cd nexdms
```

### 3. Configurar variables de entorno
```bash
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env con tus valores
```

### 4. Levantar todos los servicios
```bash
docker compose up -d
```

### 5. Verificar que todo está corriendo
```bash
docker compose ps
```

### 6. URLs de desarrollo

| Servicio  | URL                     |
|-----------|-------------------------|
| API       | http://localhost:3000   |
| Swagger   | http://localhost:3000/api|
| Web       | http://localhost:4200   |
| PWA       | http://localhost:4201   |
| Admin     | http://localhost:4202   |

> Con Nginx: agregar a `/etc/hosts`:
> ```
> 127.0.0.1 api.localhost app.localhost pwa.localhost admin.localhost
> ```

---

## Comandos útiles

```bash
# Ver logs de un servicio
docker compose logs -f api

# Ejecutar migrations
docker compose exec api npm run migration:run

# Generar una migration
docker compose exec api npm run migration:generate -- src/database/migrations/NombreMigration

# Acceder a PostgreSQL
docker compose exec postgres psql -U nexdms -d nexdms

# Rebuild de un servicio
docker compose up -d --build api

# Parar todo
docker compose down

# Parar y eliminar volúmenes (⚠️ borra los datos)
docker compose down -v
```

---

## Deploy a producción (VPS)

El pipeline de GitHub Actions se encarga automáticamente al hacer push a `main`.

### Setup inicial del VPS

```bash
# En el VPS
mkdir -p /opt/nexdms
cd /opt/nexdms
git clone https://github.com/JcLimonero/Nexus_NexDMS.git .
cp apps/api/.env.example apps/api/.env.prod
# Editar .env.prod con valores de producción
docker compose -f docker-compose.prod.yml up -d
```

### Secrets de GitHub Actions requeridos
- `VPS_HOST` — IP del VPS
- `VPS_USER` — usuario SSH (ej: `deploy`)
- `VPS_SSH_KEY` — llave SSH privada

---

## Documentación

Toda la documentación de arquitectura y módulos está en `/docs/`.
Leer antes de implementar cualquier módulo.

| Archivo | Contenido |
|---------|-----------|
| `docs/ARCHITECTURE.md` | Visión general, decisiones técnicas |
| `docs/DATABASE.md` | Todas las entidades y relaciones |
| `docs/CODING_STANDARDS.md` | Patrones de código con ejemplos |
| `docs/UX_DESIGN.md` | Sistema de calidad de datos y UX |
| `docs/modules/*.md` | Spec detallada de cada módulo |
