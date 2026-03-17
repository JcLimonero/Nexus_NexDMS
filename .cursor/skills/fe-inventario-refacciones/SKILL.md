---
name: fe-inventario-refacciones
description: >-
  Implementa el módulo de Inventario de Refacciones en NexDMS con flujo de tres
  agentes: Planificador, Ejecutor y Validador. Usar cuando se pida crear
  inventario de refacciones, partes, o el módulo de inventario-refacciones.
---

# Inventario de Refacciones — Flujo Plan-Ejecuta-Valida

Flujo de tres agentes para implementar el módulo completo de inventario de refacciones en `apps/web` (Angular 21, standalone).

## Flujo de trabajo

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ PLANIFICADOR│ ──► │  EJECUTOR   │ ──► │  VALIDADOR  │
│  (crea plan)│     │ (implementa)│     │ (revisa)    │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                          │                   │
                          │    Si hay errores  │
                          │ ◄─────────────────┘
                          │
                          ▼
                    (continuar)
```

## Fase 1: Agente Planificador

**Objetivo:** Generar un plan detallado en `docs/PLAN_INVENTARIO_REFACCIONES.md`.

1. Analizar la API existente: `parts`, `part-categories`, `stock-locations`, `stock-movements`
2. Revisar `content-routes.ts`: ruta `inventario-refacciones` usa placeholder
3. Definir componentes a crear (ver [reference.md](reference.md))
4. Escribir el plan en `docs/PLAN_INVENTARIO_REFACCIONES.md` con:
   - Lista de archivos a crear
   - Orden de implementación
   - Dependencias entre componentes
   - Checklist por componente

**Salida:** Archivo `docs/PLAN_INVENTARIO_REFACCIONES.md` creado.

## Fase 2: Agente Ejecutor

**Objetivo:** Implementar el plan. Si recibe errores del Validador, corregirlos y continuar.

1. Leer `docs/PLAN_INVENTARIO_REFACCIONES.md`
2. Crear archivos en el orden definido
3. Seguir convenciones: standalone, `inject()`, Bootstrap 5, español
4. Si hay `ERRORES_VALIDACION.md`: corregir cada error listado y eliminar el archivo al terminar

**Salida:** Código implementado.

## Fase 3: Agente Validador

**Objetivo:** Verificar que no haya errores. Si hay errores, devolver control al Ejecutor.

1. Ejecutar `npm run lint` en apps/web
2. Ejecutar `ng build` en apps/web
3. Revisar `ReadLints` en los archivos creados
4. Si hay errores:
   - Crear `docs/ERRORES_VALIDACION.md` con lista de errores
   - Indicar al usuario: "Hay errores. El Ejecutor debe corregirlos."
   - **NO** corregir directamente — devolver al Ejecutor
5. Si no hay errores: indicar "Validación OK. Módulo listo."

**Salida:** `docs/ERRORES_VALIDACION.md` (si hay errores) o confirmación de éxito.

## Regla de bucle

- **Validador encuentra errores** → Escribir errores en `docs/ERRORES_VALIDACION.md` → **Ejecutor** corrige → **Validador** vuelve a validar
- Repetir hasta que validación pase.

## Uso

Para iniciar el flujo completo, di:
- "Implementa el inventario de refacciones siguiendo el flujo Plan-Ejecuta-Valida"
- "Crea el módulo de inventario de refacciones con los tres agentes"

Para ejecutar una fase específica:
- "Actúa como Planificador: crea el plan de inventario refacciones"
- "Actúa como Ejecutor: implementa el plan" (con o sin ERRORES_VALIDACION.md)
- "Actúa como Validador: verifica el módulo inventario"

## Referencias

- Plan detallado y API: [reference.md](reference.md)
- Ejemplo de módulo similar: `apps/web/src/app/features/clientes/`
