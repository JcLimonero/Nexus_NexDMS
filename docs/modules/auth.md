# Módulo: Auth

## Endpoints

### POST /api/v1/auth/login
**Body:** `{ email, password }`
**Response:** `{ accessToken, refreshToken, user: { id, nombre, apellido, email, rol, scope, tenantId, sucursalId, marcaId } }`
**Errores:** 401 credenciales inválidas · 403 usuario inactivo · 429 demasiados intentos

### POST /api/v1/auth/refresh
**Body:** `{ refreshToken }`
**Response:** `{ accessToken }`

### POST /api/v1/auth/logout
**Headers:** Bearer token. Invalida refresh token en Redis.

### PATCH /api/v1/auth/change-password
**Body:** `{ currentPassword, newPassword }` — mínimo 8 chars, al menos 1 número

### GET /api/v1/auth/me
Perfil completo del usuario autenticado + permisos efectivos.

## Tokens
- Access token: RS256, 8h
- Refresh token: almacenado en Redis con TTL 7d
- Rate limiting login: 10 intentos / 15min por IP
- Bloqueo tras 5 intentos fallidos — desbloqueo manual por superior

## Gestión de usuarios (CRUD en módulo `users`)
- Cada rol solo puede crear usuarios de niveles inferiores dentro de su scope
- Al crear usuario: enviar email de bienvenida con contraseña temporal
- Contraseñas: bcrypt factor 12
