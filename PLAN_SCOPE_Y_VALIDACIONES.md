# Plan: Scope y Validaciones de Seguridad (assertBranchInScope y validaciones Parts)

**Proyecto**: NexDMS API (NestJS, TypeORM, PostgreSQL)  
**Objetivo**: Cerrar gaps de seguridad y consistencia en validación de scope (BRANCH/BRAND/GLOBAL) y validaciones de integridad referencial.

---

## Resumen del contexto

- **BranchesService** ya expone `assertBranchInScope(user, branchId)` que valida:
  - Branch existe y pertenece al tenant
  - Si scope BRANCH: branch debe ser el del usuario
  - Si scope BRAND: branch debe pertenecer a la legal entity del usuario
  - Si scope GLOBAL: sin restricción adicional

- **PartsService** y **StockMovementsService** ya usan `assertBranchInScope` en create/scan/createAdjustment y findAll (Parts).

- **Problema**: Varios servicios validan `branchId` solo con `branchRepo.findOne({ where: { id, tenantId } })`, sin validar scope. Un usuario con scope BRANCH podría crear recursos en otras sucursales del mismo tenant.

---

## Orden de ejecución recomendado

| # | Tarea | Dependencias |
|---|-------|--------------|
| 1 | assertBranchInScope en 9 servicios de creación | BranchesModule |
| 2 | StockMovementsService.findAll – validar filters.branchId | Ninguna |
| 3 | PartsService.create – validar categoryId y locationId | PartCategoriesModule, StockLocationsModule |
| 4 | PartsService.updateLocation – validar locationId | StockLocationsModule |

---

## 1. assertBranchInScope en servicios de creación

### 1.1 ServiceOrdersService

**Archivo**: `apps/api/src/modules/service-orders/service-orders.service.ts`

**Cambios**:
- Importar `BranchesService`.
- Inyectar `BranchesService` en el constructor.
- En `create`, **reemplazar** el bloque:
  ```typescript
  const branch = await this.branchRepo.findOne({
    where: { id: dto.branchId, tenantId: user.tenantId },
  });
  if (!branch) {
    throw new NotFoundException('Sucursal no encontrada');
  }
  ```
  por:
  ```typescript
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  ```

**Módulo**: `apps/api/src/modules/service-orders/service-orders.module.ts`
- Añadir `BranchesModule` a `imports`.

---

### 1.2 PurchaseOrdersService

**Archivo**: `apps/api/src/modules/purchase-orders/purchase-orders.service.ts`

**Cambios**:
- Importar `BranchesService`.
- Inyectar `BranchesService` en el constructor.
- En `create`, **añadir al inicio** (antes del `Promise.all`):
  ```typescript
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  ```
- **Reemplazar** el `if (!branch)` por confianza en assertBranchInScope (el branch existirá; se mantiene el fetch para `taxRate`).

**Módulo**: `apps/api/src/modules/purchase-orders/purchase-orders.module.ts`
- Añadir `BranchesModule` a `imports`.

---

### 1.3 CatalogUnitsService

**Archivo**: `apps/api/src/modules/catalog-units/catalog-units.service.ts`

**Cambios**:
- Importar `BranchesService`.
- Inyectar `BranchesService` en el constructor.
- En `create`, **reemplazar**:
  ```typescript
  const branch = await this.branchRepo.findOne({
    where: { id: dto.branchId, tenantId: user.tenantId },
  });
  if (!branch) {
    throw new NotFoundException('Sucursal no encontrada');
  }
  ```
  por:
  ```typescript
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  ```

**Módulo**: `apps/api/src/modules/catalog-units/catalog-units.module.ts`
- Añadir `BranchesModule` a `imports`.

---

### 1.4 QuotationsService

**Archivo**: `apps/api/src/modules/quotations/quotations.service.ts`

**Cambios**:
- Importar `BranchesService`.
- Inyectar `BranchesService` en el constructor.
- En `create`, **reemplazar**:
  ```typescript
  const branch = await this.branchRepo.findOne({
    where: { id: dto.branchId, tenantId: user.tenantId },
  });
  if (!branch) {
    throw new NotFoundException('Sucursal no encontrada');
  }
  ```
  por:
  ```typescript
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  const branch = await this.branchRepo.findOne({
    where: { id: dto.branchId, tenantId: user.tenantId },
  });
  ```
  (Se mantiene el `branch` para `taxRate`, `maxDiscountPct`, `quotationValidityDays`.)

**Módulo**: `apps/api/src/modules/quotations/quotations.module.ts`
- Añadir `BranchesModule` a `imports`.

---

### 1.5 AppointmentsService

**Archivo**: `apps/api/src/modules/appointments/appointments.service.ts`

**Cambios**:
- Importar `BranchesService`.
- Inyectar `BranchesService` en el constructor.
- En `create`, **reemplazar**:
  ```typescript
  const branch = await this.branchRepo.findOne({
    where: { id: dto.branchId, tenantId: user.tenantId },
  });
  if (!branch) {
    throw new NotFoundException('Sucursal no encontrada');
  }
  ```
  por:
  ```typescript
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  ```

**Módulo**: `apps/api/src/modules/appointments/appointments.module.ts`
- Añadir `BranchesModule` a `imports`.

---

### 1.6 WarrantiesService

**Archivo**: `apps/api/src/modules/warranties/warranties.service.ts`

**Cambios**:
- Importar `BranchesService`.
- Inyectar `BranchesService` en el constructor.
- En `create`, **reemplazar**:
  ```typescript
  const branch = await this.branchRepo.findOne({
    where: { id: dto.branchId, tenantId: user.tenantId },
  });
  if (!branch) {
    throw new NotFoundException('Sucursal no encontrada');
  }
  ```
  por:
  ```typescript
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  ```

**Módulo**: `apps/api/src/modules/warranties/warranties.module.ts`
- Añadir `BranchesModule` a `imports`.

---

### 1.7 CommissionsService

**Archivo**: `apps/api/src/modules/commissions/commissions.service.ts`

**Cambios**:
- Importar `BranchesService`.
- Inyectar `BranchesService` en el constructor.
- En `createPeriod`, **reemplazar**:
  ```typescript
  const branch = await this.branchRepo.findOne({
    where: { id: dto.branchId, tenantId: user.tenantId },
  });
  if (!branch) {
    throw new NotFoundException('Sucursal no encontrada');
  }
  ```
  por:
  ```typescript
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  ```

**Módulo**: `apps/api/src/modules/commissions/commissions.module.ts`
- Añadir `BranchesModule` a `imports`.

---

### 1.8 BranchPrintersService

**Archivo**: `apps/api/src/modules/branch-printers/branch-printers.service.ts`

**Cambios**:
- Importar `BranchesService`.
- Inyectar `BranchesService` en el constructor.
- En `create`, **reemplazar**:
  ```typescript
  const branch = await this.branchRepo.findOne({
    where: { id: dto.branchId, tenantId: user.tenantId },
  });
  if (!branch) {
    throw new NotFoundException('Sucursal no encontrada');
  }
  ```
  por:
  ```typescript
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  ```

**Módulo**: `apps/api/src/modules/branch-printers/branch-printers.module.ts`
- Añadir `BranchesModule` a `imports`.

---

### 1.9 UnitLocationsService

**Archivo**: `apps/api/src/modules/unit-locations/unit-locations.service.ts`

**Cambios**:
- Importar `BranchesService`.
- Inyectar `BranchesService` en el constructor.
- En `create`, **reemplazar**:
  ```typescript
  const branch = await this.branchRepo.findOne({
    where: { id: dto.branchId, tenantId: user.tenantId },
  });
  if (!branch) {
    throw new NotFoundException('Sucursal no encontrada');
  }
  ```
  por:
  ```typescript
  await this.branchesService.assertBranchInScope(user, dto.branchId);
  ```

**Módulo**: `apps/api/src/modules/unit-locations/unit-locations.module.ts`
- Añadir `BranchesModule` a `imports`.

---

## 2. StockMovementsService.findAll

**Archivo**: `apps/api/src/modules/stock-movements/stock-movements.service.ts`

**Cambios**:
- En `findAll`, al inicio del método, **añadir** (después de validar tenant):
  ```typescript
  if (filters.branchId) {
    await this.branchesService.assertBranchInScope(user, filters.branchId);
  }
  ```

**Nota**: StockMovementsModule ya importa BranchesModule y el servicio ya inyecta BranchesService. Solo se añade la validación.

---

## 3. PartsService.create – validar categoryId y locationId

**Entidades**:
- **PartCategory**: `tenant_id` (sin branchId; es global por tenant).
- **StockLocation**: `branch_id` (pertenece a una sucursal).
- **Part**: `category_id`, `location_id`, `branch_id`.

**Archivo**: `apps/api/src/modules/parts/parts.service.ts`

**Cambios**:
1. Importar `PartCategory` y `StockLocation`.
2. Inyectar `@InjectRepository(PartCategory)` y `@InjectRepository(StockLocation)`.
3. En `create`, **después** de `assertBranchInScope(user, dto.branchId)` y **antes** de crear la parte:
   - Si `dto.categoryId`:
     ```typescript
     const cat = await this.partCategoryRepo.findOne({
       where: { id: dto.categoryId, tenantId: user.tenantId },
     });
     if (!cat) {
       throw new NotFoundException(`Categoría ${dto.categoryId} no encontrada`);
     }
     ```
   - Si `dto.locationId`:
     ```typescript
     const loc = await this.stockLocationRepo.findOne({
       where: { id: dto.locationId, branchId: dto.branchId, tenantId: user.tenantId },
     });
     if (!loc) {
       throw new NotFoundException(
         `Ubicación ${dto.locationId} no encontrada o no pertenece a la sucursal`,
       );
     }
     ```

**Módulo**: `apps/api/src/modules/parts/parts.module.ts`
- Añadir `PartCategory` y `StockLocation` a `TypeOrmModule.forFeature([Part, PartCategory, StockLocation])`.
- PartsModule ya importa BranchesModule; no requiere PartCategoriesModule ni StockLocationsModule si se registran las entidades directamente.

---

## 4. PartsService.updateLocation – validar locationId

**Archivo**: `apps/api/src/modules/parts/parts.service.ts`

**Cambios**:
- En `updateLocation`, **antes** de asignar `part.locationId = locationId`:
  ```typescript
  if (locationId) {
    const loc = await this.stockLocationRepo.findOne({
      where: { id: locationId, branchId: part.branchId, tenantId: user.tenantId },
    });
    if (!loc) {
      throw new NotFoundException(
        `Ubicación ${locationId} no encontrada o no pertenece a la sucursal de la parte`,
      );
    }
  }
  part.locationId = locationId;
  ```

**Nota**: Si `locationId` es `null` o vacío, se permite (quitar ubicación). La validación solo aplica cuando se proporciona un ID.

---

## Archivos a modificar (resumen)

| Archivo | Acción |
|---------|--------|
| `service-orders.service.ts` | Añadir assertBranchInScope en create |
| `service-orders.module.ts` | Importar BranchesModule |
| `purchase-orders.service.ts` | Añadir assertBranchInScope en create |
| `purchase-orders.module.ts` | Importar BranchesModule |
| `catalog-units.service.ts` | Añadir assertBranchInScope en create |
| `catalog-units.module.ts` | Importar BranchesModule |
| `quotations.service.ts` | Añadir assertBranchInScope en create |
| `quotations.module.ts` | Importar BranchesModule |
| `appointments.service.ts` | Añadir assertBranchInScope en create |
| `appointments.module.ts` | Importar BranchesModule |
| `warranties.service.ts` | Añadir assertBranchInScope en create |
| `warranties.module.ts` | Importar BranchesModule |
| `commissions.service.ts` | Añadir assertBranchInScope en createPeriod |
| `commissions.module.ts` | Importar BranchesModule |
| `branch-printers.service.ts` | Añadir assertBranchInScope en create |
| `branch-printers.module.ts` | Importar BranchesModule |
| `unit-locations.service.ts` | Añadir assertBranchInScope en create |
| `unit-locations.module.ts` | Importar BranchesModule |
| `stock-movements.service.ts` | Validar filters.branchId en findAll |
| `parts.service.ts` | Validar categoryId y locationId en create; locationId en updateLocation |
| `parts.module.ts` | Añadir PartCategory y StockLocation a TypeOrmModule.forFeature |

---

## Criterios de aceptación

### assertBranchInScope en servicios de creación
- [ ] Usuario con scope BRANCH no puede crear recursos en sucursales distintas a la suya.
- [ ] Usuario con scope BRAND no puede crear recursos en sucursales de otras legal entities.
- [ ] Usuario con scope GLOBAL puede crear en cualquier sucursal del tenant.
- [ ] Si branchId no existe o no pertenece al tenant, se lanza NotFoundException.

### StockMovementsService.findAll
- [ ] Si `filters.branchId` se proporciona, se valida con assertBranchInScope antes de filtrar.
- [ ] Si no se proporciona branchId, el método funciona como antes.

### PartsService.create
- [ ] Si `dto.categoryId` se proporciona, debe existir en el tenant; si no, NotFoundException.
- [ ] Si `dto.locationId` se proporciona, debe existir en `stock_locations` con `branchId = dto.branchId`; si no, NotFoundException.
- [ ] Si no se proporcionan categoryId ni locationId, el create funciona como antes.

### PartsService.updateLocation
- [ ] Si `locationId` se proporciona, debe existir en `stock_locations` con `branchId = part.branchId`; si no, NotFoundException.
- [ ] Si `locationId` es null/undefined, se permite (quitar ubicación).

---

## Imports típicos para servicios

```typescript
// Para servicios que añaden assertBranchInScope
import { BranchesService } from '../branches/branches.service';

// Constructor
constructor(
  // ... repos existentes
  private readonly branchesService: BranchesService,
) {}
```

---

## Nota sobre QuotationsService

En QuotationsService, tras `assertBranchInScope` se sigue necesitando el objeto `branch` para `taxRate`, `maxDiscountPct` y `quotationValidityDays`. Mantener la consulta `branchRepo.findOne` después de la validación; no eliminar esa línea.
