# Plan: Validación de branchId en PartsService y StockMovementsService

## Resumen

Se implementarán validaciones de seguridad para garantizar que:
1. Todo `branchId` provisto exista y pertenezca al tenant del usuario.
2. El usuario tenga acceso según su scope (BRANCH → solo su branch; BRAND → branches de su legal entity; GLOBAL → cualquiera del tenant).

---

## Orden de ejecución

| Paso | Tarea | Dependencias |
|------|-------|--------------|
| 1 | Exponer método `assertBranchInScope` en BranchesService | - |
| 2 | PartsModule: importar BranchesModule e inyectar BranchesService | Paso 1 |
| 3 | PartsService.create: validar dto.branchId | Paso 2 |
| 4 | PartsService.scan: validar branchId (query param) | Paso 2 |
| 5 | PartsService.findAll: validar filters.branchId cuando se proporcione | Paso 2 |
| 6 | StockMovementsModule: importar BranchesModule e inyectar BranchesService | Paso 1 |
| 7 | StockMovementsService.createAdjustment: validar dto.branchId | Paso 6 |

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `apps/api/src/modules/branches/branches.service.ts` | Hacer público `assertInScope` o crear `assertBranchInScope` público |
| `apps/api/src/modules/parts/parts.module.ts` | Importar `BranchesModule` |
| `apps/api/src/modules/parts/parts.service.ts` | Inyectar `BranchesService`, llamar validación en create, scan, findAll |
| `apps/api/src/modules/stock-movements/stock-movements.module.ts` | Importar `BranchesModule` |
| `apps/api/src/modules/stock-movements/stock-movements.service.ts` | Inyectar `BranchesService`, llamar validación en createAdjustment |

---

## Método reutilizable: `assertBranchInScope`

### Ubicación

`BranchesService` ya tiene `assertInScope` (privado). Se expondrá como método público `assertBranchInScope` para reutilización.

### Comportamiento (referencia: `branches.service.ts` líneas 198-223)

```typescript
// Lógica actual de assertInScope:
// 1. Buscar branch por id + tenantId
// 2. Si no existe → NotFoundException
// 3. BRANCH: branch.id debe ser user.branchId
// 4. BRAND: branch.legalEntityId debe ser user.legalEntityId
// 5. GLOBAL: sin restricción adicional
```

### Cambio en BranchesService

- **Opción recomendada**: Crear método público `assertBranchInScope(user, branchId)` que invoque al privado `assertInScope`, manteniendo encapsulación.
- **Alternativa**: Cambiar `assertInScope` de `private` a `public` y renombrarlo a `assertBranchInScope` para claridad semántica.

---

## Cambios concretos

### 1. BranchesService (`branches.service.ts`)

```typescript
// Añadir método público (o hacer público el existente)
async assertBranchInScope(user: UserPayload, branchId: string): Promise<void> {
  await this.assertInScope(user, branchId);
}
```

### 2. PartsModule (`parts.module.ts`)

```typescript
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Part]),
    BranchesModule,  // ← Añadir
  ],
  // ...
})
```

### 3. PartsService (`parts.service.ts`)

**Constructor:**
```typescript
constructor(
  @InjectRepository(Part)
  private readonly partRepo: Repository<Part>,
  private readonly branchesService: BranchesService,  // ← Añadir
) {}
```

**create:**
```typescript
async create(user: UserPayload, dto: CreatePartDto): Promise<Part> {
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  // ... resto del método
}
```

**scan:**
```typescript
async scan(user: UserPayload, code: string, branchId: string): Promise<Part> {
  // ... validaciones de code y branchId vacíos
  await this.branchesService.assertBranchInScope(user, branchId);
  // ... resto del método
}
```

**findAll:**
```typescript
async findAll(user: UserPayload, filters: FilterPartsDto): Promise<...> {
  if (filters.branchId) {
    await this.branchesService.assertBranchInScope(user, filters.branchId);
  }
  // ... resto del método (applyScope, etc.)
}
```

### 4. StockMovementsModule (`stock-movements.module.ts`)

```typescript
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockMovement, Part]),
    BranchesModule,  // ← Añadir
  ],
  // ...
})
```

### 5. StockMovementsService (`stock-movements.service.ts`)

**Constructor:**
```typescript
constructor(
  @InjectRepository(StockMovement)
  private readonly movementRepo: Repository<StockMovement>,
  @InjectRepository(Part)
  private readonly partRepo: Repository<Part>,
  private readonly branchesService: BranchesService,  // ← Añadir
) {}
```

**createAdjustment:**
```typescript
async createAdjustment(user: UserPayload, dto: CreateAdjustmentDto): Promise<StockMovement> {
  // ... validación de type
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  // ... resto del método (transacción)
}
```

---

## Criterios de aceptación

### PartsService.create

- [ ] Si `dto.branchId` no existe → `NotFoundException`
- [ ] Si `dto.branchId` no pertenece a `user.tenantId` → `NotFoundException`
- [ ] Si scope BRANCH y `branchId !== user.branchId` → `NotFoundException`
- [ ] Si scope BRAND y branch no pertenece a `user.legalEntityId` → `NotFoundException`
- [ ] Si scope GLOBAL y branch existe en tenant → OK

### PartsService.scan

- [ ] Si `branchId` no existe o no pertenece al tenant → `NotFoundException`
- [ ] Si scope BRANCH y `branchId !== user.branchId` → `NotFoundException`
- [ ] Si scope BRAND y branch no pertenece a legal entity del usuario → `NotFoundException`
- [ ] Si scope GLOBAL y branch existe en tenant → OK

### PartsService.findAll

- [ ] Si `filters.branchId` se proporciona y usuario BRANCH pasa branchId de otra sucursal → `NotFoundException`
- [ ] Si `filters.branchId` se proporciona y branch no existe o no pertenece al tenant → `NotFoundException`
- [ ] Si `filters.branchId` no se proporciona → sin cambio (applyScope sigue aplicando)

### StockMovementsService.createAdjustment

- [ ] Si `dto.branchId` no existe o no pertenece al tenant → `NotFoundException`
- [ ] Si scope BRANCH y `branchId !== user.branchId` → `NotFoundException`
- [ ] Si scope BRAND y branch no pertenece a legal entity del usuario → `NotFoundException`
- [ ] Si scope GLOBAL y branch existe en tenant → OK

---

## Referencias en el codebase

| Servicio | Método | Patrón |
|----------|--------|--------|
| `BranchesService` | `assertInScope` | Valida tenant + scope (BRANCH/BRAND/GLOBAL) |
| `CashRegisterService` | `assertBranchInScope` | Valida scope BRANCH/BRAND (usa Branch repo) |
| `PriceListsService` | `checkBranchAccess` | Valida scope BRANCH/BRAND (usa repo.manager) |
| `UsersService` | `create` | Valida branchIds con `branchRepo.find({ where: { id: In(branchIds), tenantId } })` |

La implementación en BranchesService es la más completa (incluye validación de existencia + tenant + scope). Se reutilizará en Parts y StockMovements.

---

## Notas adicionales

1. **BranchesModule** ya exporta `BranchesService`, por lo que importar `BranchesModule` en PartsModule y StockMovementsModule permite inyectar el servicio sin modificar BranchesModule.

2. **StockMovementsService.findAll** también recibe `filters.branchId` (FilterStockMovementsDto). Por consistencia, se podría añadir validación en un paso posterior si se considera necesario. El plan actual se centra en `createAdjustment` por ser el endpoint de escritura más crítico.

3. **Mensaje de error**: BranchesService usa `NotFoundException` con mensaje genérico "Sucursal X no encontrada" para no revelar si la sucursal existe en otro tenant (security by obscurity). Se mantendrá este patrón.
