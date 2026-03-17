# Troubleshooting: Error 500 en Login

## Causas habituales

El login (`POST /api/v1/auth/login`) puede devolver **500 Internal Server Error** por:

1. **API no está corriendo** – El proxy de Angular envía las peticiones a `localhost:3000`.
2. **Redis no está disponible** – La API usa Redis para throttling y tokens de refresh.
3. **Base de datos no accesible** – PostgreSQL debe estar en ejecución.

---

## Pasos de verificación

### 1. Comprobar que la API está corriendo

```bash
# Desde la raíz del proyecto
npm run api:dev
```

La API debe escuchar en `http://localhost:3000`. Si no está en ejecución, el proxy devolverá error de conexión (502/500).

### 2. Comprobar contenedores Docker

```bash
docker ps
```

Deben aparecer al menos:

- `nexDMS_postgres` (puerto 5433)
- `nexDMS_redis` (puerto 6379)

Si usas la API en Docker:

```bash
docker compose up -d postgres redis api
```

### 3. Health check (sin pasar por throttling)

```bash
# Liveness (no usa Redis)
curl http://localhost:3000/api/v1/health

# Readiness (comprueba DB + Redis)
curl http://localhost:3000/api/v1/health/ready
```

Si `ready` devuelve 503, revisa el JSON para ver si falla `database` o `redis`.

### 4. Revisar logs de la API

Al hacer login, la API registra errores en la consola. Busca líneas como:

- `Redis connection refused`
- `connect ECONNREFUSED`
- Stack traces completos

---

## Credenciales de prueba

| Email                  | Contraseña   | Tenant |
|------------------------|--------------|--------|
| admin@demo.local       | demo123      | demo   |
| admin@nexusqtech.com   | 00@Limonero  | demo   |

---

## Variables de entorno relevantes

En `apps/api/.env`:

- `DATABASE_URL` – Para ejecución local: `postgresql://nexdms:nexdms_dev@localhost:5433/nexdms`
- `REDIS_URL` – Para ejecución local: `redis://:nexdms_dev@localhost:6379`

Si la API corre en Docker, `docker-compose` sobrescribe estas URLs con los nombres de servicio (`postgres`, `redis`).

---

## Errores específicos

### 503 "Redis no disponible"

Redis no está corriendo o la contraseña es incorrecta. Comprueba:

```bash
docker exec nexDMS_redis redis-cli -a nexdms_dev ping
# Debe responder: PONG
```

### 401 "Credenciales inválidas"

Usuario o contraseña incorrectos, o el usuario no existe. Ejecuta los seeds:

```bash
cd apps/api
npm run seed
```

### 401 "Usuario sin sucursales asignadas"

El usuario no tiene filas en `user_branches`. Los seeds crean estas asignaciones; si faltan, ejecuta de nuevo los seeds.

---

## Error 500 en GET /api/v1/clients

Si al cargar la lista de clientes obtienes **500 Internal Server Error**:

### 1. Revisar la respuesta completa

En DevTools → Red → clic en la petición fallida → pestaña **Respuesta**. El cuerpo suele incluir `message` y `stack` con el error real.

### 2. Revisar logs de la API

En la terminal donde corre `npm run api:dev`, busca el stack trace que aparece al fallar la petición.

### 3. Causas habituales

| Causa | Solución |
|-------|----------|
| Migraciones no ejecutadas | `npm run api:migration:run` |
| Tabla `clients` inexistente | Ejecutar migraciones |
| Base de datos no accesible | Verificar PostgreSQL en puerto 5433 |
| Token expirado o inválido | Cerrar sesión y volver a iniciar sesión |

### 4. Probar el endpoint directamente

```bash
# Obtener token tras login
TOKEN="tu_access_token_aqui"

# Probar listado de clientes
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/clients?page=1&limit=20"
```
