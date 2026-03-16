# Plan de Implementación Unificado

> Combina tres módulos: **Disponibilidad de Usuarios**, **Accesorios para Venta de Unidades** y **Trámites Extras (unit_sale_extras)**.

**Fecha:** 2025-03-16  
**Fuente:** Planes consolidados para NexDMS

---

## 1. Orden de Ejecución Recomendado

| Orden | Módulo | Razón |
|-------|--------|-------|
| **1** | **Disponibilidad de Usuarios** | Base para el módulo de Agenda/Citas existente. El endpoint `GET /agenda/disponibilidad` ya está documentado pero no implementado. Sin horarios y ausencias no hay slots reales. |
| **2** | **Accesorios para Venta de Unidades** | Catálogo independiente que se vincula a `catalog_units` y `unit_sales`. No depende de disponibilidad. |
| **3** | **Trámites Extras (unit_sale_extras)** | Depende de `unit_sales`. Se implementa después para integrar correctamente con CFDI y el flujo de completar venta. |

---

## 2. Dependencias entre Módulos

```
┌─────────────────────────────────────────────────────────────────┐
│  users (existente)                                               │
│  appointments (existente)                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  FASE 1: Disponibilidad Usuarios                                │
│  user_availability_schedules, user_absences                      │
│  → Alimenta GET /agenda/disponibilidad (slots por mecánico)      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  catalog_units (existente)  │  unit_sales (existente)            │
└──────────────────────────┬─┴──────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────────┐
│  FASE 2:      │   │  FASE 3:      │   │  CFDI (existente)     │
│  Accesorios   │   │  Trámites     │   │  → Incluir accesorios │
│  unit_sale_   │   │  unit_sale_   │   │    y extras en items  │
│  accessories  │   │  extras       │   │    del CFDI Ingreso   │
└───────────────┘   └───────────────┘   └───────────────────────┘
```

- **Disponibilidad** no depende de accesorios ni extras.
- **Accesorios** y **Extras** son independientes entre sí, pero ambos se integran con `unit_sales` y CFDI.

---

## 3. Recomendaciones Técnicas

### 3.1 Orden de Migraciones (evitar conflictos)

| # | Migración | Tablas/Enums | Notas |
|---|-----------|--------------|-------|
| 1 | `AddUserAvailabilitySchedules` | `user_availability_schedules` | Horarios semanales por usuario/sucursal |
| 2 | `AddUserAbsences` | `user_absences` | Ausencias (vacaciones, permisos) |
| 3 | `AddUnitAccessories` | `unit_accessories`, `unit_accessory_compatibility` | Catálogo y compatibilidad con modelos |
| 4 | `AddUnitSaleAccessories` | `unit_sale_accessories` | Líneas de accesorios por venta |
| 5 | `AddUnitSaleExtras` | `unit_sale_extras` | Seguros, placas, etc. |

**Regla:** Cada migración en un archivo separado. Timestamps secuenciales (ej: `1773645600000`, `1773645700000`, …) para mantener orden.

### 3.2 ¿unit-accessories y unit-sale-extras en el mismo módulo o separados?

**Recomendación: Módulos separados.**

| Criterio | Accesorios | Extras |
|----------|------------|--------|
| **Dominio** | Productos físicos con catálogo y compatibilidad | Trámites administrativos (seguro, placas) |
| **Modelo** | `unit_accessories` + `unit_accessory_compatibility` + `unit_sale_accessories` | `unit_sale_extras` (tipos: SEGURO, PLACAS, OTRO) |
| **CFDI** | Items con clave SAT de producto | Items con clave SAT de servicio (80141600, etc.) |
| **UI** | Selector por compatibilidad con la unidad | Formulario con proveedor, monto, referencia |
| **Validación** | Stock opcional (si se venden como inventario) | Sin stock |

**Estructura sugerida:**
- `modules/unit-accessories/` — catálogo, compatibilidad, CRUD
- `modules/unit-sales/` — extender con `unit_sale_accessories` y `unit_sale_extras` como sub-recursos, o:
- `modules/unit-sale-extras/` — solo lógica de extras (seguros, placas) si se prefiere separación total

**Alternativa pragmática:** Mantener ambos dentro de `unit-sales` como submódulos (DTOs, entidades, servicios) si el equipo es pequeño y se quiere menos overhead de módulos.

### 3.3 Integración con CFDI y UnitSales existente

- **UnitSales:** Ya tiene `cfdi_uuid`, `complete()`, y encola generación de CFDI.
- **Cambio requerido:** Al construir el payload de FacturAPI para venta de unidad, incluir:
  1. Items de `unit_sale_accessories` (descripción, precio, cantidad, clave SAT producto)
  2. Items de `unit_sale_extras` (descripción, monto, clave SAT servicio)
- **CfdiService:** Extender `generarIngreso` para aceptar `referenciaTipo: 'UNIT_SALE'` y cargar `unit_sale_accessories` + `unit_sale_extras` además del precio base de la unidad.
- **Total CFDI:** `precio_final_unidad + SUM(accesorios) + SUM(extras)` debe coincidir con el total facturado.

### 3.4 Conflictos potenciales

| Riesgo | Mitigación |
|--------|------------|
| Migraciones en paralelo con otros PRs | Usar timestamps altos (17736456+) y coordinar con equipo |
| FK circular appointments ↔ user_availability | No hay FK directa; disponibilidad se calcula en runtime |
| Cambio de esquema `unit_sales` | Preferir tablas hijas (`unit_sale_accessories`, `unit_sale_extras`) sin alterar `unit_sales` |
| Scope/roles en nuevos endpoints | Reutilizar `ScopeGuard`, `RolesGuard` y roles existentes (SELLER, MANAGER, etc.) |

---

## 4. Checklist de Tareas por Fase

### FASE 1: Disponibilidad de Usuarios

| # | Tarea | Tipo |
|---|-------|------|
| 1.1 | Crear migración `AddUserAvailabilitySchedules` (tabla `user_availability_schedules`: user_id, branch_id, day_of_week, start_time, end_time) | Migración |
| 1.2 | Crear migración `AddUserAbsences` (tabla `user_absences`: user_id, branch_id, start_date, end_date, type, notes) | Migración |
| 1.3 | Crear entidad `UserAvailabilitySchedule` | Entidad |
| 1.4 | Crear entidad `UserAbsence` | Entidad |
| 1.5 | Crear módulo `user-availability` (o extender `users`) con servicio de horarios y ausencias | Módulo |
| 1.6 | Implementar `getAvailableSlots(branchId, mechanicId?, date, durationMin)` — considera horarios, ausencias y citas existentes | Servicio |
| 1.7 | Crear endpoint `GET /agenda/disponibilidad?branchId=&mechanicId=&date=&durationMin=` | Controller |
| 1.8 | Actualizar `AppointmentsService.create` para validar slot disponible si se proporciona `mechanicId` | Servicio |
| 1.9 | UI: pantalla de configuración de horarios por usuario/sucursal | Frontend |
| 1.10 | UI: pantalla de ausencias (calendario o lista) | Frontend |

### FASE 2: Accesorios para Venta de Unidades

| # | Tarea | Tipo |
|---|-------|------|
| 2.1 | Crear migración `AddUnitAccessories` (tabla `unit_accessories`: nombre, sku, precio, clave_sat, etc.) | Migración |
| 2.2 | Crear migración `AddUnitAccessoryCompatibility` (tabla `unit_accessory_compatibility`: accessory_id, global_model_id) | Migración |
| 2.3 | Crear migración `AddUnitSaleAccessories` (tabla `unit_sale_accessories`: unit_sale_id, accessory_id, quantity, unit_price) | Migración |
| 2.4 | Crear entidades `UnitAccessory`, `UnitAccessoryCompatibility`, `UnitSaleAccessory` | Entidades |
| 2.5 | Crear módulo `unit-accessories` con CRUD de catálogo | Módulo |
| 2.6 | Crear servicio de compatibilidad: `getCompatibleAccessories(catalogUnitId)` | Servicio |
| 2.7 | Extender `UnitSalesService.create` y DTO para aceptar `accessories: [{ accessoryId, quantity }]` | Servicio |
| 2.8 | Extender `UnitSalesService.complete` para persistir accesorios y pasarlos a CFDI | Servicio |
| 2.9 | Actualizar `CfdiService.generarIngreso` para incluir items de `unit_sale_accessories` | Servicio |
| 2.10 | UI: catálogo de accesorios, asignación de compatibilidad por modelo | Frontend |
| 2.11 | UI: selector de accesorios en flujo de venta de unidad (filtrado por compatibilidad) | Frontend |

### FASE 3: Trámites Extras (unit_sale_extras)

| # | Tarea | Tipo |
|---|-------|------|
| 3.1 | Crear migración `AddUnitSaleExtras` (tabla `unit_sale_extras`: unit_sale_id, type [SEGURO, PLACAS, OTRO], description, amount, provider?, reference?) | Migración |
| 3.2 | Crear entidad `UnitSaleExtra` | Entidad |
| 3.3 | Extender `UnitSalesService` y DTOs para aceptar `extras: [{ type, description, amount, provider?, reference? }]` | Servicio |
| 3.4 | Extender `UnitSalesService.complete` para persistir extras y pasarlos a CFDI | Servicio |
| 3.5 | Actualizar `CfdiService.generarIngreso` para incluir items de `unit_sale_extras` con claves SAT de servicio | Servicio |
| 3.6 | UI: formulario de extras en flujo de venta (seguro, placas, etc.) | Frontend |
| 3.7 | Incluir total de extras en resumen y total final de la venta | Frontend |

---

## 5. Estimación de Archivos por Módulo

| Módulo | Crear | Modificar | Total aprox. |
|--------|-------|-----------|--------------|
| **Disponibilidad** | 8–10 | 2–3 | ~12 |
| **Accesorios** | 12–15 | 4–5 | ~18 |
| **Extras** | 4–6 | 3–4 | ~9 |

### Desglose

**Disponibilidad:**
- Crear: 2 migraciones, 2 entidades, 1 módulo, 1 servicio, 1 controller, 2 DTOs, 2 componentes UI
- Modificar: `AppointmentsService`, `AppointmentsModule`, `app.module`

**Accesorios:**
- Crear: 3 migraciones, 3 entidades, 1 módulo, 1 servicio, 1 controller, 4 DTOs, 2–3 componentes UI
- Modificar: `UnitSalesService`, `UnitSalesModule`, `CfdiService`, `CreateUnitSaleDto`, flujo venta UI

**Extras:**
- Crear: 1 migración, 1 entidad, 1 DTO, 1 componente UI
- Modificar: `UnitSalesService`, `CfdiService`, `CreateUnitSaleDto`, flujo venta UI

---

## 6. Resumen Ejecutivo

1. **Orden:** Disponibilidad → Accesorios → Extras.
2. **Disponibilidad** habilita slots reales para citas; requiere `user_availability_schedules` y `user_absences`.
3. **Accesorios** y **Extras** son módulos de dominio distintos; se recomienda implementación separada (o submódulos dentro de unit-sales).
4. **CFDI:** Extender el payload de Ingreso para incluir items de accesorios y extras al completar venta de unidad.
5. **Migraciones:** Secuenciales, una por feature, con timestamps que eviten solapamiento.
6. **Estimación:** ~39 archivos entre crear y modificar en total.

---

*Documento generado por el Agente de Planificación. Ajustar según prioridades de negocio y capacidad del equipo.*
