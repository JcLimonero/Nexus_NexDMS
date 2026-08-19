# Referencia — Validación de Combos

Documentación de apoyo para el skill `validate-combo-loading`.

## Servicios y APIs

| Servicio | Método | API |
|----------|--------|-----|
| BranchesService | getAll | /api/v1/branches |
| ClientesService | getAll | /api/v1/clients |
| ClientTypesService | getAll | /api/v1/client-types |
| InventarioRefaccionesService | getCategories | /api/v1/part-categories |
| InventarioRefaccionesService | getLocations | /api/v1/stock-locations |
| InventarioUnidadesService | getLocations | /api/v1/unit-locations |
| InventarioUnidadesService | getUnits | /api/v1/catalog-units |
| ComprasService | getSuppliers | /api/v1/suppliers |
| TallerService | getMechanicsForBranch | /api/v1/user-availability/mechanics-with-details |
| TallerService | getVehiclesByClient | /api/v1/clients/:id/vehicles |
| CatalogoService | getBrands | /api/v1/global-models/brands |
| CatalogoService | getAll | /api/v1/global-models |
| VehicleTypesService | getAll | /api/v1/vehicle-types |
| CombustionTypesService | getAll | /api/v1/combustion-types |
| GlobalBrandsService | getAll | /api/v1/global-brands |
| GarantiasService | getVehiclesByClient | /api/v1/clients/:id/vehicles |
| VentasUnidadesService | getCompatibleAccessories | /api/v1/unit-accessories/compatible |

## Patrones de implementación

### Combo simple (sin dependencias)

```typescript
// En ngOnInit o constructor
this.branchesService.getAll().subscribe({
  next: (res) => this.branches.set(res.data ?? []),
});
```

### Combo con dependencia (valueChanges)

```typescript
this.form.get("branchId")?.valueChanges.subscribe((branchId) => {
  if (!branchId) return;
  this.inventarioService.getLocations(branchId).subscribe({
    next: (locations) => this.locations.set(locations),
  });
});
```

### Combo con parámetro dinámico

```typescript
this.form.get("vehicleType")?.valueChanges.subscribe((vt) => {
  this.catalogoService.getBrands(vt || "CAR").subscribe({
    next: (b) => this.brands.set(b),
  });
});
```

## Cómo agregar un combo al registro

1. Añadir entrada en `apps/web/src/app/shared/data/combo-registry.ts`:

```typescript
{
  component: "NombreComponente",
  file: "app/features/modulo/componente/archivo.ts",
  field: "campoFormControl",
  service: "NombreService",
  method: "getAll",
  api: "/api/v1/endpoint",
  dependsOn: "campoPadre", // opcional
  type: "form", // form | list | detail
},
```

2. Ejecutar `node .cursor/skills/validate-combo-loading/scripts/audit-combos.js` para verificar.

## Cómo agregar un combo al código

1. Inyectar el servicio: `private service = inject(NombreService);`
2. Inicializar signal/array: `items = signal<T[]>([]);`
3. Llamar en ngOnInit o valueChanges: `this.service.getX().subscribe({ next: (r) => this.items.set(r) });`
4. Registrar en combo-registry.ts
5. Ejecutar auditoría

## Comandos

```bash
# Auditoría completa
node .cursor/skills/validate-combo-loading/scripts/audit-combos.js

# Si se añade validate:combos en package.json
npm run validate:combos
```
