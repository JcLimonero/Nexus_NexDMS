# Plan de Mejoras Pendientes — NexDMS API

**Proyecto**: NexDMS API (NestJS, TypeORM, PostgreSQL)  
**Fecha**: 16 de marzo de 2025  
**Contexto**: Implementación principal completada. Mejoras identificadas en revisión reciente.

---

## Resumen ejecutivo

| # | Mejora | Prioridad | Impacto | Esfuerzo |
|---|--------|-----------|---------|----------|
| 1 | CreateUserDto — validación `roles` | Alta | Crítico | Bajo |
| 2 | Tests E2E GET /documents/pending y POST /users | Alta | Alto | Medio |
| 3 | GET /documents/pending — validación `clientId` | Media | Medio | Bajo |
| 4 | ScopeGuard en POST /users (opcional) | Baja | Evaluar | Medio |

---

## Orden de ejecución recomendado

1. **CreateUserDto — validación de roles** (rápido, evita usuarios huérfanos)
2. **Tests E2E** (garantiza regresión y documenta comportamiento)
3. **Validación clientId en GET /documents/pending** (mejora robustez)
4. **ScopeGuard en POST /users** (opcional, según decisión de producto)

---

## 1. CreateUserDto — validación de roles

### Problema
Si se envía `roles: []`, se crea un usuario sin roles que no podrá hacer login ni acceder a recursos protegidos.

### Archivos a modificar
- `apps/api/src/modules/users/dto/create-user.dto.ts`

### Cambios concretos

```typescript
// Añadir import
import { ArrayMinSize } from 'class-validator';

// En el campo roles, añadir decorador
@IsArray()
@ArrayMinSize(1, { message: 'Debe asignar al menos un rol al usuario' })
@IsEnum(RoleEnum, { each: true })
roles: RoleEnum[];
```

### Criterios de aceptación
- [ ] `POST /users` con `roles: []` retorna **400 Bad Request** con mensaje de validación
- [ ] `POST /users` con `roles: ['ADMIN']` (o al menos un rol válido) funciona correctamente
- [ ] El mensaje de error es claro y en español

---

## 2. Tests E2E — GET /documents/pending y POST /users

### Problema
No existen tests E2E para estos endpoints críticos. Riesgo de regresión y falta de documentación ejecutable.

### Estructura de referencia
Basada en `test/auth.e2e-spec.ts` y `test/purchase-orders.e2e-spec.ts`:

- Uso de `Test.createTestingModule` con `AppModule`
- Override de `AuthGuard` para inyectar usuario mock (tests autenticados)
- Override de `REDIS_CLIENT` para evitar dependencia de Redis
- `app.setGlobalPrefix('api/v1')` y `ValidationPipe` (o `configureE2eApp` si existe)
- Tests con `supertest` y `request(app.getHttpServer())`

### Archivos a crear/modificar

#### 2.1 Crear `apps/api/test/documents-pending.e2e-spec.ts`

**Estructura propuesta** (similar a `purchase-orders.e2e-spec.ts`):

```typescript
describe('DocumentsPendingController (e2e)', () => {
  // Mock user con rol DOCUMENT_VALIDATOR o ADMIN
  // Override DocumentsService.findPending
  // Override AuthGuard, RolesGuard
  // Override REDIS_CLIENT

  describe('GET /api/v1/documents/pending', () => {
    it('debe retornar 200 con array de documentos pendientes');
    it('debe llamar al service con clientId cuando se pasa como query param');
    it('debe retornar 401 sin token');
  });
});
```

**Tests concretos**:
| Test | Descripción |
|------|-------------|
| `debe retornar 200 con array de documentos pendientes` | GET sin clientId, verifica estructura de respuesta |
| `debe llamar al service con clientId cuando se pasa` | GET con `?clientId=uuid`, verifica que se pasa al service |
| `debe retornar 401 sin token` | GET sin Authorization header |
| `debe retornar 403 con rol no autorizado` | Usuario con rol que no está en la lista permitida |

#### 2.2 Crear `apps/api/test/users.e2e-spec.ts`

**Estructura propuesta**:

```typescript
describe('UsersController (e2e)', () => {
  // Mock user con rol ADMIN
  // Override UsersService.create
  // Override AuthGuard, RolesGuard
  // Override REDIS_CLIENT
  // ValidationPipe activo para probar DTOs

  describe('POST /api/v1/users', () => {
    it('debe retornar 201 con usuario creado cuando el body es válido');
    it('debe retornar 400 cuando roles está vacío');
    it('debe retornar 401 sin token');
    it('debe retornar 403 con rol no autorizado (ej. WAREHOUSE)');
  });
});
```

**Tests concretos**:
| Test | Descripción |
|------|-------------|
| `debe retornar 201 con usuario creado` | Body válido con roles, scope, branchIds |
| `debe retornar 400 cuando roles está vacío` | `roles: []` → validación DTO |
| `debe retornar 401 sin token` | Sin Authorization |
| `debe retornar 403 con rol no autorizado` | Usuario con rol distinto de SUPERADMIN/ADMIN |

### Configuración E2E
- Usar `configureE2eApp` de `test/setup-e2e.ts` si los tests existentes lo aplican; si no, añadir `app.setGlobalPrefix('api/v1')` y `ValidationPipe` en `beforeAll` (como en `auth.e2e-spec.ts`).
- Verificar que `test/jest-e2e.json` incluye todos los archivos `*.e2e-spec.ts`.

### Criterios de aceptación
- [ ] `test:e2e` pasa para `documents-pending.e2e-spec.ts` y `users.e2e-spec.ts`
- [ ] Tests cubren casos felices y de error (401, 403, 400)
- [ ] Estructura alineada con `auth.e2e-spec.ts` y `purchase-orders.e2e-spec.ts`

---

## 3. GET /documents/pending — validación de clientId

### Problema
Cuando se pasa `clientId` como query param, no se valida que sea un UUID válido. Un valor inválido puede provocar errores en BD o respuestas confusas.

### Archivos a modificar
- `apps/api/src/modules/documents/documents-pending.controller.ts`

### Cambios concretos

**Opción A — ParseUUIDPipe opcional** (recomendada):

```typescript
import { ParseUUIDPipe } from '@nestjs/common/pipes';

// En el método findPending:
findPending(
  @CurrentUser() user: UserPayload,
  @Query('clientId', new ParseUUIDPipe({ optional: true })) clientId?: string,
) {
  return this.documentsService.findPending(user, clientId || undefined);
}
```

- `optional: true`: si `clientId` no se envía, no falla.
- Si se envía un valor no UUID, retorna 400 con mensaje estándar de NestJS.

**Opción B — DTO con class-validator** (alternativa):

Crear `FindPendingDocumentsDto` con `@IsOptional() @IsUUID('4') clientId?: string` y usar `@Query()` con el DTO. Requiere más cambios pero mantiene validación declarativa.

### Criterios de aceptación
- [ ] `GET /documents/pending` sin `clientId` funciona igual que antes
- [ ] `GET /documents/pending?clientId=invalid` retorna **400 Bad Request**
- [ ] `GET /documents/pending?clientId=<uuid-válido>` funciona correctamente

---

## 4. ScopeGuard en POST /users (opcional)

### Contexto
`ScopeGuard` filtra datos según el scope del usuario (BRANCH, BRAND, GLOBAL). En `POST /users` se crean usuarios con `branchIds` y `scope` definidos en el DTO.

### Evaluación
- **POST /users** no consulta entidades filtradas por scope; crea un usuario nuevo.
- El `ScopeGuard` actúa sobre `scopeQueryBuilder` en el request; en creación de usuarios no hay query builder.
- Los `branchIds` del DTO ya se validan en el servicio (pertenencia al tenant, existencia de branches).
- **Conclusión**: ScopeGuard no aplica de forma directa a POST /users porque no hay consulta a filtrar.

### Posible mejora relacionada
Si se desea restringir que un usuario con scope BRANCH solo pueda crear usuarios en su misma branch:
- Validar en `UsersService.create` que los `branchIds` del DTO estén dentro del alcance del usuario que crea (según su `scope` y `branchId`/`legalEntityId`).
- Esto sería lógica de negocio en el servicio, no ScopeGuard.

### Recomendación
- **No aplicar ScopeGuard** en POST /users tal cual.
- **Opcional**: Añadir validación en `UsersService.create` para que usuarios con scope BRANCH solo puedan asignar su propia branch en `branchIds`. Documentar como mejora futura si el producto lo requiere.

### Criterios de aceptación (si se implementa validación de alcance)
- [ ] Usuario con scope BRANCH no puede crear usuario con branchIds de otra branch
- [ ] Usuario con scope BRAND puede crear usuarios en branches de su legal entity
- [ ] SUPERADMIN/ADMIN con scope GLOBAL sin restricción

---

## Checklist de implementación

```
[ ] 1. CreateUserDto: añadir @ArrayMinSize(1) a roles
[ ] 2. Tests E2E documents-pending.e2e-spec.ts
[ ] 3. Tests E2E users.e2e-spec.ts
[ ] 4. DocumentsPendingController: ParseUUIDPipe opcional para clientId
[ ] 5. (Opcional) ScopeGuard/validación de alcance en POST /users
```

---

## Comandos útiles

```bash
# Ejecutar tests E2E
cd apps/api && npm run test:e2e

# Ejecutar un archivo específico
npm run test:e2e -- documents-pending.e2e-spec
npm run test:e2e -- users.e2e-spec
```

---

## Referencias

- `test/auth.e2e-spec.ts` — estructura de tests con mocks
- `test/purchase-orders.e2e-spec.ts` — override de AuthGuard, tests de endpoints protegidos
- `test/setup-e2e.ts` — configuración ValidationPipe y prefijo
- `docs/CODING_STANDARDS.md` — convenciones del proyecto
