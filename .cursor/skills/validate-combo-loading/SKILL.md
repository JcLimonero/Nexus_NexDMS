---
name: validate-combo-loading
description: >-
  Valida que todos los combos/dropdowns de formularios en NexDMS se carguen
  desde sus APIs correspondientes. Genera reportes de auditoría y mantiene el
  registro de combos actualizado. Usar cuando se pida verificar carga de combos,
  auditar APIs de dropdowns o validar combo-registry.
---

# Validar Carga de Combos desde APIs

Sub-agente que verifica que cada combo (select/dropdown) en formularios y listas de NexDMS se cargue desde la API correcta.

## Flujo de trabajo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AUDITORÍA     │ ──► │   REPORTE        │ ──► │   CORRECCIÓN    │
│ (escanea código)│     │ (COMBO_AUDIT)   │     │ (opcional)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Fase 1: Auditoría

**Objetivo:** Comparar el registro de combos con la implementación real.

1. Leer `apps/web/src/app/shared/data/combo-registry.ts`
2. Para cada entrada del registro:
   - Buscar el archivo del componente (ej. `venta-unidad-form.ts`)
   - Verificar que el componente inyecte el servicio esperado
   - Verificar que llame al método esperado (ej. `getAll()`, `getSuppliers()`)
   - Verificar que el resultado se asigne a la variable/signal usada en el combo
3. Buscar combos en el código que NO estén en el registro (posibles omisiones)
4. Generar `docs/COMBO_AUDIT_REPORT.md`

**Patrones a buscar:**
- `XService.getAll().subscribe`
- `XService.getCategories().subscribe`
- `XService.getLocations(branchId).subscribe`
- `XService.getSuppliers().subscribe`
- `XService.getMechanicsForBranch(branchId).subscribe`
- `XService.getVehiclesByClient(clientId).subscribe`
- `XService.getBrands(vt).subscribe`
- `XService.getUnits().subscribe`

## Fase 2: Reporte

**Formato de `docs/COMBO_AUDIT_REPORT.md`:**

```markdown
# Auditoría de Combos — [fecha]

## OK (implementación correcta)
| Componente | Campo | Servicio | API |
|------------|-------|----------|-----|
| VentaUnidadForm | branchId | BranchesService | /api/v1/branches |
...

## Faltantes (en registro pero no implementado)
| Componente | Campo | Servicio esperado |
...

## Sin registro (implementado pero no en registry)
| Archivo | Servicio | Método |
...

## Errores (API incorrecta o desactualizada)
| Componente | Campo | Esperado | Encontrado |
...
```

## Fase 3: Actualizar registro (si hay omisiones)

1. Si se encuentran combos implementados que no están en el registro → agregarlos a `combo-registry.ts`
2. Si hay entradas en el registro que ya no existen → eliminarlas
3. Ejecutar de nuevo la auditoría para validar

## Script de validación

Ejecutar desde la raíz del proyecto:

```bash
node .cursor/skills/validate-combo-loading/scripts/audit-combos.js
```

O agregar a `package.json`:

```json
"scripts": {
  "validate:combos": "node .cursor/skills/validate-combo-loading/scripts/audit-combos.js"
}
```

## Uso

- "Valida que los combos se carguen desde sus APIs"
- "Audita el registro de combos y genera el reporte"
- "Verifica que todos los dropdowns usen la API correcta"
- "Ejecuta la auditoría de combos"

## Referencias

- Registro de combos: [combo-registry.ts](../../../apps/web/src/app/shared/data/combo-registry.ts)
- Detalle de APIs y componentes: [reference.md](reference.md)
