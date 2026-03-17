# Spanish → English Mappings

## Route paths

| Spanish | English |
|---------|---------|
| clientes | clients |
| catalogo | catalog |
| inventario-refacciones | parts-inventory |
| inventario-unidades | units-inventory |
| compras | purchases |
| almacen | warehouse |
| caja | cash-register |
| ventas | sales |
| cotizaciones | quotes |
| taller | workshop |
| garantias | warranties |
| configuracion | settings |
| contactos | contacts |
| ordenes-compra | purchase-orders |
| ordenes-servicio | service-orders |
| tipos-vehiculo | vehicle-types |
| tipos-combustion | combustion-types |
| categorias | categories |
| ubicaciones | locations |

## Variable/constant names

| Spanish | English |
|---------|---------|
| clientesRoutes | clientsRoutes |
| catalogoRoutes | catalogRoutes |
| inventarioRefaccionesRoutes | partsInventoryRoutes |
| inventarioUnidadesRoutes | unitsInventoryRoutes |
| comprasRoutes | purchasesRoutes |
| almacenRoutes | warehouseRoutes |
| cajaVentasRoutes | cashRegisterRoutes |
| ventasUnidadesRoutes | unitSalesRoutes |
| cotizacionesRoutes | quotesRoutes |
| tallerRoutes | workshopRoutes |
| garantiasRoutes | warrantiesRoutes |
| configuracionRoutes | settingsRoutes |
| contactosRoutes | contactsRoutes |

## Karma + Jasmine in NexDMS

- **Command:** `cd apps/web && npm test` or `ng test`
- **Config:** `angular.json` → `test` → `@angular/build:karma`
- **Spec pattern:** `**/*.spec.ts`
- **Frameworks:** Jasmine (describe, it, expect), Karma (browser runner)

## Example spec (smoke test)

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```
