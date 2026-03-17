---
name: performance-testing
description: >-
  Ejecuta pruebas de performance en NexDMS para detectar lentitud progresiva
  al navegar entre módulos. Usa Lighthouse, Angular DevTools, análisis de
  memory leaks y bundle. Usar cuando la app se vuelve lenta al cambiar de
  módulos, hay problemas de rendimiento, o se pide auditar performance.
---

# Pruebas de Performance — NexDMS

Flujo para diagnosticar y documentar lentitud progresiva al navegar entre módulos en `apps/web` (Angular 21, lazy loading).

## Síntoma objetivo

La aplicación se vuelve más lenta tras visitar varios módulos (clientes, inventario, taller, etc.). Posibles causas: memory leaks, subscriptions sin cleanup, bundles grandes, change detection excesiva.

## Flujo de trabajo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AUDITORÍA     │ ──► │    ANÁLISIS      │ ──► │    REPORTE      │
│ (Lighthouse,    │     │ (memory leaks,   │     │ (docs/PERF_*)   │
│  DevTools)      │     │  subscriptions)  │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Fase 1: Auditoría

### 1.1 Lighthouse

1. Ejecutar app: `cd apps/web && npm start`
2. Abrir Chrome DevTools → pestaña Lighthouse
3. Configurar: Performance (desktop + mobile)
4. Auditar: página inicial (Dashboard) y luego tras navegar a 5+ módulos
5. Capturar: scores, LCP, TBT, CLS, métricas de memoria

### 1.2 Angular DevTools

1. Instalar extensión [Angular DevTools](https://angular.dev/tools/devtools)
2. Pestaña **Profiler**: grabar sesión mientras navegas entre módulos
3. Revisar: tiempo de change detection, componentes que más ejecutan

### 1.3 Bundle analysis

```bash
cd apps/web && npm run build -- --configuration=production
# Revisar salida en dist/web para tamaños de chunks
```

O si existe `source-map-explorer`:
```bash
npx source-map-explorer dist/web/browser/*.js --html dist/web/bundle-report.html
```

## Fase 2: Análisis de causas

### 2.1 Memory leaks — Subscriptions

**Buscar:** `apps/web/src` (TypeScript)

- `.subscribe(` sin `takeUntilDestroyed()` o `takeUntil(destroy$)`
- `ngOnDestroy` ausente en componentes con `subscribe`
- Patrones: `setInterval`, `setTimeout`, `addEventListener` sin cleanup

**Comando de búsqueda:**
```bash
rg "\.subscribe\(" apps/web/src --type ts -l
```
Luego revisar cada archivo: ¿hay `takeUntilDestroyed()` o `takeUntil(destroy$)`?

**Patrón correcto (Angular 16+):**
```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';

// En constructor o inject()
private destroyRef = inject(DestroyRef);

this.service.getData().pipe(
  takeUntilDestroyed(this.destroyRef)
).subscribe(...);
```

### 2.2 Lazy loading

**Verificar:** `apps/web/src/app/shared/routes/content-routes.ts`

- Todas las rutas deben usar `loadChildren` (no `import` estático)
- Cada módulo debe cargarse en chunks separados

### 2.3 Change detection

- Buscar componentes sin `OnPush` en listas grandes (tablas, grids)
- Revisar `*ngFor` sin `trackBy` en listas dinámicas

### 2.4 Servicios globales

- `TableService`, `CartService`, etc.: ¿retienen datos en memoria?
- `Router.events` o `NavigationEnd` subscriptions sin cleanup

## Fase 3: Reporte

Crear `docs/PERF_REPORT.md` con:

```markdown
# Reporte de Performance — NexDMS

## Fecha
[Fecha]

## Métricas Lighthouse
- [Dashboard inicial]: Performance X, LCP Y ms
- [Tras 5+ navegaciones]: Performance X, LCP Y ms
- [Diferencia]

## Hallazgos

### Memory leaks
- [ ] Archivo X: subscribe sin takeUntilDestroyed
- [ ] Archivo Y: addEventListener sin removeEventListener

### Bundle
- [ ] Chunk inicial: X kB
- [ ] Chunks lazy: listado

### Recomendaciones
1. ...
2. ...
```

## Uso

- "Ejecuta pruebas de performance en NexDMS"
- "La app se va lenta al navegar entre módulos, audita"
- "Revisa memory leaks y performance"

## Referencia adicional

Ver [reference.md](reference.md) para patrones de cleanup y comandos detallados.
