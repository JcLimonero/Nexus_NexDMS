# Plan de Implementación - Tareas Pendientes NexDMS API

**Proyecto**: NexDMS API (NestJS, TypeORM, PostgreSQL)  
**Fecha**: 16 de marzo de 2025  
**Contexto**: Monolito en `apps/api/`, módulos auth, users, documents, service-orders, legal-entities, etc.

---

## Resumen Ejecutivo

| # | Tarea | Prioridad | Impacto | Dependencias |
|---|-------|-----------|---------|--------------|
| 1 | GET /documents/pending | Alta | Funcional | Ninguna |
| 2 | CreateUserDto / POST /users | Alta | Funcional | Ninguna |
| 3 | findByEmailAllTenants (eliminar) | Baja | Mantenimiento | Ninguna |
| 4 | Usuarios sin roles | Media | Robustez | Ninguna |
| 5 | ClientDocument redundancia | Media | Claridad | Ninguna |
| 6 | Nuevos roles en controllers | Media | Seguridad | Ninguna |

---

## 1. GET /documents/pending – Endpoint para documentos pendientes

### Descripción
Endpoint para listar documentos pendientes de validación, con opción de filtrar por cliente o listar todos los del tenant.

### Orden de ejecución
**Prioridad 1** – Alto valor para usuarios con rol DOCUMENT_VALIDATOR.

### Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `apps/api/src/modules/documents/documents.service.ts` | Añadir método `findPending()` |
| `apps/api/src/modules/documents/documents.controller.ts` | Crear nuevo controller o ruta |
| `apps/api/src/modules/documents/documents.module.ts` | Registrar nuevo controller si aplica |

### Cambios concretos

#### 1.1 DocumentsService – Nuevo método

```typescript
// documents.service.ts
async findPending(
  user: UserPayload,
  clientId?: string,
): Promise<ClientDocument[]> {
  const where: { tenantId: string; status: ClientDocumentStatusEnum } = {
    tenantId: user.tenantId,
    status: ClientDocumentStatusEnum.PENDING,
  };
  if (clientId) {
    await this.assertClientExists(user, clientId);
    where.clientId = clientId;
  }
  return this.docRepo.find({
    where,
    order: { createdAt: 'DESC' },
    relations: ['client'], // opcional: incluir datos del cliente
  });
}
```

**Nota**: Si se incluye `relations: ['client']`, verificar que la entidad ClientDocument tenga `@ManyToOne(() => Client)`. Si no existe, añadir la relación o devolver solo `clientId` y que el frontend resuelva.

#### 1.2 Estructura de rutas

Actualmente los documentos están bajo `clients/:clientId/documents`. Para `GET /documents/pending` hay dos opciones:

**Opción A (recomendada)**: Nuevo controller en el mismo módulo

- Crear `DocumentsPendingController` con `@Controller('documents')`
- Ruta: `GET /documents/pending?clientId=uuid` (query opcional)
- Roles: `SUPERADMIN`, `ADMIN`, `MANAGER`, `DOCUMENT_VALIDATOR`

**Opción B**: Añadir ruta en AppModule con controlador global

- Menos limpio; se recomienda Opción A.

#### 1.3 Implementación Opción A

Crear `apps/api/src/modules/documents/documents-pending.controller.ts`:

```typescript
@Controller('documents')
@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
export class DocumentsPendingController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('pending')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'DOCUMENT_VALIDATOR')
  findPending(
    @CurrentUser() user: UserPayload,
    @Query('clientId') clientId?: string,
  ) {
    return this.documentsService.findPending(user, clientId || undefined);
  }
}
```

Registrar en `documents.module.ts`:

```typescript
controllers: [DocumentsController, DocumentsPendingController],
```

### Criterios de aceptación

- [ ] `GET /api/v1/documents/pending` devuelve todos los documentos PENDING del tenant
- [ ] `GET /api/v1/documents/pending?clientId=uuid` devuelve solo los PENDING del cliente indicado
- [ ] Solo accesible por SUPERADMIN, ADMIN, MANAGER, DOCUMENT_VALIDATOR
- [ ] Respuesta 404 si `clientId` no existe o no pertenece al tenant
- [ ] Documentado en Swagger

### Recomendación
**Implementar**. Es necesario para que los validadores de documentos vean la cola de trabajo sin navegar cliente por cliente. Usar query opcional `clientId` mantiene flexibilidad.

---

## 2. CreateUserDto sin uso – POST /users

### Descripción
El DTO `CreateUserDto` existe con `roles[]`, `scope`, `branchIds` pero no hay controller que lo use. El módulo Users no tiene controllers (`controllers: []`).

### Orden de ejecución
**Prioridad 2** – Necesario si se requiere gestión de usuarios vía API.

### Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `apps/api/src/modules/users/users.service.ts` | Añadir método `create(dto)` |
| `apps/api/src/modules/users/users.controller.ts` | **Crear** – nuevo controller |
| `apps/api/src/modules/users/users.module.ts` | Registrar controller |
| `apps/api/src/modules/users/dto/create-user.dto.ts` | Revisar validaciones (`branchIds` opcional) |

### Cambios concretos

#### 2.1 Corrección CreateUserDto

El DTO actual tiene `@IsUUID('4', { each: true })` aplicado a `branchIds` sin `@IsArray()`. Además, `branchIds` podría ser opcional para usuarios con scope GLOBAL.

```typescript
// create-user.dto.ts - Ajustes sugeridos
@IsArray()
@IsUUID('4', { each: true })
@IsOptional()  // Si scope=GLOBAL podría no requerir branches
branchIds?: string[];
```

Si siempre se requieren branches para usuarios con sucursales, mantener requerido pero validar en servicio según `scope`.

#### 2.2 UsersService – Método create

```typescript
async create(tenantId: string, dto: CreateUserDto): Promise<User> {
  const existing = await this.findByEmail(tenantId, dto.email);
  if (existing) {
    throw new ConflictException('El email ya está registrado');
  }
  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
  const user = this.userRepo.create({
    tenantId,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    passwordHash,
    scope: dto.scope,
    isActive: true,
  });
  const saved = await this.userRepo.save(user);
  for (const role of dto.roles) {
    await this.userRoleRepo.save(
      this.userRoleRepo.create({ userId: saved.id, role }),
    );
  }
  for (let i = 0; i < dto.branchIds.length; i++) {
    await this.userBranchRepo.save(
      this.userBranchRepo.create({
        userId: saved.id,
        branchId: dto.branchIds[i],
        isDefault: i === 0,
      }),
    );
  }
  return this.findOneOrFail(saved.id, tenantId);
}
```

Requiere inyectar `UserRole` repository en UsersService.

#### 2.3 UsersController

```typescript
@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('SUPERADMIN', 'ADMIN')
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(user.tenantId, dto);
  }
}
```

### Criterios de aceptación

- [ ] `POST /api/v1/users` crea usuario con roles y branches
- [ ] Solo SUPERADMIN y ADMIN pueden crear usuarios
- [ ] Validación de email único en tenant
- [ ] Password hasheado con bcrypt
- [ ] Respuesta no incluye `passwordHash`
- [ ] Documentado en Swagger

### Recomendación
**Implementar** si la aplicación necesita alta de usuarios por API (admin, onboarding). Si solo se crean usuarios por seeds o herramientas externas, se puede **eliminar CreateUserDto** para reducir código muerto. Consultar con producto.

---

## 3. findByEmailAllTenants – Código muerto

### Descripción
El método `findByEmailAllTenants` en `users.service.ts` no es usado en ningún lugar del codebase. Auth usa `findByEmail(tenantId, email)` con tenant específico.

### Orden de ejecución
**Prioridad 3** – Limpieza de código.

### Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `apps/api/src/modules/users/users.service.ts` | Eliminar método `findByEmailAllTenants` |

### Cambios concretos

Eliminar líneas 36-40:

```typescript
async findByEmailAllTenants(email: string): Promise<User[]> {
  return this.userRepo.find({
    where: { email, deletedAt: IsNull() },
  });
}
```

### Criterios de aceptación

- [ ] Método eliminado
- [ ] No hay referencias rotas (grep confirmado)
- [ ] Tests pasan

### Recomendación
**Eliminar**. No hay uso actual. Si en el futuro se necesita login multi-tenant (mismo email en varios tenants), se puede reintroducir.

---

## 4. Usuarios sin roles – Robustez

### Descripción
Asegurar que seeds y lógica manejen correctamente usuarios sin filas en `user_roles` (ej. `getRoleNames` devuelve `[]`).

### Orden de ejecución
**Prioridad 4** – Evitar errores en edge cases.

### Archivos a revisar/modificar

| Archivo | Acción |
|---------|--------|
| `apps/api/src/modules/users/users.service.ts` | Verificar `getRoleNames` |
| `apps/api/src/modules/auth/auth.service.ts` | Revisar flujo con roles vacíos |
| `apps/api/src/common/guards/roles.guard.ts` | Comportamiento con `[]` |
| `apps/api/src/database/seeds/run-seeds.ts` | Ya asigna rol ADMIN – OK |

### Estado actual

- `getRoleNames`: `user.roles?.map((r) => r.role) ?? []` → ya devuelve `[]` si no hay roles.
- Auth: si `roles` es `[]`, el usuario tendría payload con `roles: []` y fallaría en endpoints con `@Roles()`.
- Seeds: siempre crean `UserRole` para admin.

### Cambios concretos

1. **AuthService – login**: Rechazar login si usuario no tiene roles (evitar usuarios “zombie”):

```typescript
const roles = this.usersService.getRoleNames(user);
if (roles.length === 0) {
  throw new UnauthorizedException(
    'Usuario sin roles asignados. Contacte al administrador.',
  );
}
```

2. **RolesGuard**: Confirmar que con `roles: []` se deniegue el acceso (comportamiento esperado).

3. **Documentar**: En README o docs, indicar que todo usuario debe tener al menos un rol.

### Criterios de aceptación

- [ ] Usuario sin roles no puede hacer login
- [ ] `getRoleNames` devuelve `[]` sin errores
- [ ] RolesGuard deniega acceso cuando `roles` está vacío
- [ ] Seeds siguen creando usuarios con roles

### Recomendación
**Implementar** la validación en login. Es una defensa sencilla contra usuarios mal configurados.

---

## 5. ClientDocument redundancia – validatedById vs validatedBy

### Descripción
En `client-document.entity.ts` existen:
- `@Column validatedById` (columna `validated_by`)
- `@ManyToOne validatedBy` (misma columna `validated_by`)

Ambos mapean la misma columna. Es redundante pero funcional.

### Orden de ejecución
**Prioridad 5** – Refactor de claridad.

### Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `apps/api/src/modules/documents/entities/client-document.entity.ts` | Eliminar redundancia |
| `apps/api/src/modules/documents/documents.service.ts` | Usar solo `validatedById` o relación |

### Análisis

- **validatedById**: usado en `documents.service.ts` para asignar `doc.validatedById = user.sub`.
- **validatedBy**: relación para cargar el User. No se usa actualmente en el servicio.

Opciones:

**Opción A**: Mantener solo `@ManyToOne validatedBy` y usar `doc.validatedBy = { id: user.sub } as User` o asignar por ID. TypeORM permite `doc.validatedById = user.sub` si la relación tiene el join column, pero la entidad no expone `validatedById` explícitamente cuando solo hay relación.

**Opción B (recomendada)**: Mantener `validatedById` como columna explícita para escritura simple y eliminar `@ManyToOne validatedBy` si no se usa. O al revés: eliminar `validatedById` y usar solo la relación, y en el servicio hacer:

```typescript
doc.validatedBy = { id: user.sub } as User;
// o
doc.validatedById = user.sub; // si se mantiene la columna
```

La forma más limpia en TypeORM: tener **solo** la relación `@ManyToOne validatedBy` con `@JoinColumn({ name: 'validated_by' })`. Para asignar:

```typescript
doc.validatedBy = { id: user.sub } as User;
```

TypeORM persiste el ID en `validated_by`. No hace falta la columna duplicada.

### Cambios concretos

Eliminar `@Column validatedById` y dejar solo:

```typescript
@ManyToOne(() => User, { onDelete: 'SET NULL' })
@JoinColumn({ name: 'validated_by' })
validatedBy?: User;
```

En `documents.service.ts`, cambiar:

```typescript
doc.validatedById = user.sub;
```

por:

```typescript
doc.validatedBy = { id: user.sub } as User;
```

### Criterios de aceptación

- [ ] Una sola representación de `validated_by` en la entidad
- [ ] approve/reject siguen guardando correctamente el validador
- [ ] Migraciones no necesarias (misma columna)

### Recomendación
**Refactorizar** eliminando `validatedById` y usando solo la relación. Mejora claridad y permite cargar `validatedBy` con datos del usuario si se necesita en el futuro.

---

## 6. Nuevos roles en controllers – AML_OFFICER, AUDITOR, EXECUTIVE

### Descripción
Roles como AML_OFFICER, AUDITOR, EXECUTIVE existen en `RoleEnum` pero no aparecen en `@Roles()` de los controllers. Evaluar si deben añadirse a endpoints concretos.

### Orden de ejecución
**Prioridad 6** – Ajuste de permisos por rol.

### Roles actuales en RoleEnum

- SUPERADMIN, ADMIN, MANAGER, WAREHOUSE, CASHIER, MECHANIC, SELLER
- EXECUTIVE, LEGAL_ENTITY_MANAGER, ADMIN_MANAGER, PARTS_MANAGER, AFTERSALES_MANAGER, IT_MANAGER
- AML_OFFICER, DOCUMENT_VALIDATOR, AUDITOR

### Roles usados en controllers

- DOCUMENT_VALIDATOR: approve/reject en documents
- Resto: no aparecen en ningún @Roles()

### Recomendaciones por rol

| Rol | Sugerencia | Endpoints sugeridos |
|-----|------------|---------------------|
| **AML_OFFICER** | Añadir a documentos y clientes | GET documents/pending, GET/POST documents, GET clients (lectura), approve/reject |
| **AUDITOR** | Solo lectura amplia | GET en la mayoría de módulos (auditoría), sin escritura |
| **EXECUTIVE** | Vista ejecutiva | Reportes, dashboards, ventas, comisiones (lectura) |
| **LEGAL_ENTITY_MANAGER** | Gestión por entidad legal | Legal entities, branches de su entidad |
| **ADMIN_MANAGER, PARTS_MANAGER, AFTERSALES_MANAGER, IT_MANAGER** | Definir con negocio | Según responsabilidades de cada rol |

### Cambios concretos (fase inicial)

1. **AML_OFFICER**: Añadir a documentos (mismo nivel que DOCUMENT_VALIDATOR para AML):
   - `GET /documents/pending`
   - `GET /clients/:clientId/documents`
   - `POST approve/reject` (si aplica para AML)

2. **AUDITOR**: Añadir solo lectura en módulos sensibles:
   - GET clients, GET documents, GET service-orders, GET sales, etc.
   - No POST/PUT/DELETE

3. **EXECUTIVE**: Añadir lectura en:
   - GET sales, GET commissions, GET unit-sales, reportes

### Criterios de aceptación

- [ ] AML_OFFICER puede acceder a documentos pendientes y validación (según definición de negocio)
- [ ] AUDITOR tiene acceso de solo lectura a datos auditables
- [ ] EXECUTIVE tiene acceso a datos ejecutivos/reportes
- [ ] Documentar matriz de permisos por rol

### Recomendación
**Evaluar con negocio** antes de implementar. La matriz de permisos debe definirse con producto. Como mínimo, añadir AML_OFFICER a documentos si el rol existe para cumplimiento AML.

---

## Orden de ejecución recomendado

```
1. GET /documents/pending          (valor inmediato)
2. findByEmailAllTenants (eliminar) (rápido, sin riesgo)
3. ClientDocument redundancia      (refactor limpio)
4. Usuarios sin roles (login)      (robustez)
5. CreateUserDto / POST /users     (si se confirma necesidad)
6. Nuevos roles en controllers     (tras definición de negocio)
```

---

## Dependencias entre tareas

- **1 y 6**: GET /documents/pending puede incluir desde el inicio los roles DOCUMENT_VALIDATOR y AML_OFFICER.
- **2**: POST /users es independiente; CreateUserDto ya existe.
- **3, 4, 5**: Independientes entre sí y del resto.

---

## Notas finales

- Ejecutar tests tras cada cambio: `npm run test` (o equivalente).
- Revisar migraciones antes de tocar esquema (items 1–5 no requieren migraciones).
- Mantener coherencia con convenciones del proyecto (decoradores, guards, DTOs).
