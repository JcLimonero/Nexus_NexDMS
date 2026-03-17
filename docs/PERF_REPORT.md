# Reporte de Performance — NexDMS

## Fecha

17 de marzo de 2026

---

## Resumen ejecutivo

La auditoría detectó **presupuesto de bundle excedido**, **posibles memory leaks** por subscriptions sin cleanup en componentes compartidos (sidebar, breadcrumb) y en múltiples formularios, y **dependencias CommonJS** que pueden afectar la optimización. El lazy loading está correctamente configurado.

---

## 1. Métricas de Bundle

### Build de producción

| Métrica | Valor | Presupuesto | Estado |
|---------|-------|-------------|--------|
| **Bundle inicial total** | **2.31 MB** | 500 kB | ⚠️ Excedido en 1.81 MB |
| **Styles CSS** | 1.57 MB (154 kB transfer) | — | Alto |
| **main.js** | 124 kB | — | OK |
| **polyfills** | 36 kB | — | OK |

### Chunks iniciales (carga en frío)

| Archivo | Tamaño | Transfer |
|---------|--------|----------|
| styles-RVTRSPDS.css | 1.5 MB | ~154 kB |
| chunk-5BPIIM4J.js | 208 kB | ~63 kB |
| chunk-QBBTL4N2.js | 184 kB | ~55 kB |
| main-GYPXCQA3.js | 124 kB | ~36 kB |
| chunk-IRNZXAVT.js | 116 kB | ~29 kB |

### Chunks lazy más grandes

| Chunk | Tamaño | Módulo |
|-------|--------|--------|
| chunk-TG6KJKWI.js | 532 kB | — |
| chunk-3VWEWWNQ.js | 148 kB | project |
| chunk-GYJ4YO33.js | 108 kB | — |
| chunk-XVVQQ7JN.js | 72 kB | content-layout |
| chunk-P3FXIB5O.js | 68 kB | e-commerce |

### Warnings del build

- **Bundle initial**: excede máximo 500 kB en 1.81 MB
- **cliente-form.scss**: excede 4 kB (total 5.52 kB)
- **Dependencias CommonJS** (optimization bailouts):
  - `feather-icons` (content-layout)
  - `apexcharts` (ng-apexcharts)
  - `rfdc` (@swimlane/ngx-charts)
- 17 reglas CSS con selectores no coincidentes

---

## 2. Hallazgos — Memory leaks

### 2.1 Subscriptions sin cleanup (prioridad alta)

Componentes compartidos que se mantienen durante toda la sesión:

| Archivo | Problema |
|---------|----------|
| `sidebar.ts` | `navServices.items.subscribe` + `router.events.subscribe` anidados, sin `takeUntilDestroyed` ni `ngOnDestroy` |
| `breadcrumb.ts` | `router.events.pipe(...).subscribe` sin `takeUntilDestroyed` |

### 2.2 Subscriptions en formularios y componentes de detalle (prioridad media)

Múltiples archivos con `.subscribe()` sin `takeUntilDestroyed()` o `takeUntil(destroy$)`:

- `expediente-recompra.ts` (8+ subscriptions)
- `ubicacion-form.ts` (inventario-unidades y inventario-refacciones)
- `categoria-form.ts`
- `parte-form.ts`, `parte-detail.ts`
- `proveedor-form.ts`
- `orden-compra-detail.ts`, `orden-compra-form.ts`
- `unidad-recompra.ts`, `unidad-detail.ts`
- `transferencia-form.ts`, `transferencia-detail.ts`
- `apartado-form.ts`, `apartado-detail.ts`
- `venta-form.ts`, `venta-detail.ts`
- `sesion-detail.ts`
- `lista-precio-form.ts`
- `garantia-form.ts`, `garantia-detail.ts`

**Excepción:** `client-selector.ts` usa correctamente `takeUntilDestroyed(this.destroyRef)`.

### 2.3 Timers y event listeners

| Archivo | Problema |
|---------|----------|
| `sweet-alert.ts` | `setInterval` dentro de `didOpen` de Swal sin `clearInterval` al cerrar el modal |
| `general.ts` (widget) | ✅ Tiene `ngOnDestroy` con `clearInterval` |
| `page-with-video.ts`, `page-with-image.ts`, `simple.ts` | ✅ Tienen `ngOnDestroy` con `clearInterval` |

---

## 3. Lazy loading

**Estado: ✅ Correcto**

Todas las rutas en `content-routes.ts` usan `loadChildren` con imports dinámicos. Los módulos se cargan en chunks separados.

---

## 4. Change detection y listas

- **@for con track**: La mayoría de listas usan `@for` con `track` (ej. `track doc.id`), lo cual es correcto.
- **OnPush**: No se encontraron componentes con `ChangeDetectionStrategy.OnPush`. Considerar para listas grandes (tablas, grids).

---

## 5. Recomendaciones

### Inmediatas

1. **Sidebar y Breadcrumb**: Añadir `takeUntilDestroyed(this.destroyRef)` a las subscriptions de `router.events` y `navServices.items`.
2. **Sweet-alert**: Guardar el ID del `setInterval` y llamar a `clearInterval` cuando Swal se cierre (en `then` o callback de cierre).

### Corto plazo

3. **Formularios y detalles**: Añadir `takeUntilDestroyed` o `takeUntil(destroy$)` a todas las subscriptions en componentes que se destruyen al navegar.
4. **Bundle inicial**: Revisar qué incluye `chunk-5BPIIM4J` (210 kB) y `chunk-QBBTL4N2` (186 kB); considerar code-splitting adicional.
5. **Estilos**: Revisar `cliente-form.scss` y dividir o optimizar para cumplir el presupuesto de 4 kB por componente.

### Medio plazo

6. **Dependencias ESM**: Evaluar alternativas ESM para `feather-icons`, `apexcharts` y `rfdc`, o marcar como CommonJS en `angular.json` si no hay alternativa.
7. **OnPush**: Aplicar `ChangeDetectionStrategy.OnPush` en componentes de listas grandes (clientes, inventario, órdenes, etc.).
8. **Lighthouse manual**: Ejecutar Lighthouse en Dashboard inicial y tras navegar 5+ módulos para comparar LCP, TBT, CLS y memoria.

---

## 6. Próximos pasos (auditoría manual)

Para completar la auditoría según el skill de performance:

1. **Lighthouse**: `npm start` → Chrome DevTools → Lighthouse (Performance, desktop + mobile).
2. **Angular DevTools**: Instalar extensión, pestaña Profiler, grabar sesión navegando entre módulos.
3. **Bundle report**: `npx source-map-explorer dist/web/browser/*.js --html dist/web/bundle-report.html` (si está instalado).

---

## Referencia

- Skill: `.cursor/skills/performance-testing/SKILL.md`
- Rutas: `apps/web/src/app/shared/routes/content-routes.ts`
- Presupuestos: `apps/web/angular.json` (initial: 500kB, anyComponentStyle: 4kB)
