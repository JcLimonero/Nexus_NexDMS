# Plan Total One — preset de módulos para producción

Edición **Total One** (requerimientos de Total Dealer / DMS Lite) empaquetada como
**preset de módulos** sobre la misma base de código. No es un fork: es un `plan` +
`enabled_modules` por tenant. Ver contexto y análisis en [`DMS-LITE-TOTALDEALER.md`](DMS-LITE-TOTALDEALER.md).

## Cómo funciona (mecanismo real del sistema)
Cada tenant tiene en la tabla `tenants`:
- `plan` (`BASIC` | `PRO` | `ENTERPRISE`) → **techo** de lo contratable.
- `enabled_modules` (jsonb, lista de keys) → **qué subconjunto está encendido**. `null` = todo lo del plan (sin addons).

`resolveModules(plan, enabled_modules)` = lo que ve el tenant. Los módulos `core`
(`dashboard`, `clients`, `settings`) siempre quedan activos. Las keys viven en
`apps/api/src/modules/modules/module-registry.ts`.

## Clasificación por edición (regla acordada)
- Los **20 módulos de la lista** están en **ambas** ediciones (Total One **y** NexQS).
- **Todo lo demás del registro es exclusivo de NexQS** (`bodywork`, `fleets`, los 3 `wa-*`, `finance`, `billing`).
- **No hay módulos exclusivos de Total One**: su set es un subconjunto de NexQS.

Fuente de verdad en código: `TOTAL_ONE_MODULES` en
[`apps/api/src/modules/modules/module-registry.ts`](apps/api/src/modules/modules/module-registry.ts)
(+ helpers `modulesForEdition('total-one'|'nexqs')` e `isTotalOneModule(key)`).

## Preset "Total One" (keys reales)

**Plan (techo):** `ENTERPRISE` — necesario porque `pld` y `reports` son de nivel ENTERPRISE.

**`enabled_modules` (20 módulos ON):**
```json
["dashboard","clients","settings","cash-register","parts-inventory","quotes",
 "workshop","reception","warranties","catalog","units-inventory","sales",
 "sale-documents","purchases","warehouse","leads","used-units","cfdi","pld","reports"]
```

| Módulo (key) | Nombre | Total One |
|---|---|:---:|
| `dashboard` | Inicio | ✅ core |
| `clients` | Clientes / unidades | ✅ core |
| `settings` | Configuración (usuarios, sucursales) | ✅ core |
| `cash-register` | Caja y ventas (mostrador) | ✅ |
| `parts-inventory` | Inventario de refacciones | ✅ |
| `quotes` | Cotizaciones / presupuestos | ✅ |
| `workshop` | Taller (órdenes, citas) | ✅ |
| `reception` | Recepción de unidades | ✅ |
| `warranties` | Garantías | ✅ |
| `catalog` | Catálogo (marcas/modelos/tipos) | ✅ |
| `units-inventory` | Inventario de unidades | ✅ |
| `sales` | Ventas de unidades (reservas, plan de pagos) | ✅ |
| `sale-documents` | Expediente documental (legalidad) | ✅ |
| `purchases` | Compras a proveedores | ✅ |
| `warehouse` | Almacén (traspasos, apartados) | ✅ |
| `leads` | CRM básico (leads pre-venta) | ✅ |
| `used-units` | Seminuevos / recompra | ✅ |
| `cfdi` | Facturación CFDI | ✅ |
| `pld` | Cumplimiento PLD | ✅ |
| `reports` | Reportes | ✅ |

**Apagados (quedan solo en NexQS):**

| Módulo (key) | Motivo |
|---|---|
| `bodywork` | Hojalatería y pintura — fuera del alcance DMS Lite |
| `fleets` | Flotillas — NexQS |
| `wa-service-due` · `wa-appointment-reminder` · `wa-conversational-agent` | Complementos WhatsApp (addons) — NexQS |
| `finance` | Cuentas por cobrar/pagar (contabilidad avanzada) — **decisión**: encender si el piloto lo pide |
| `billing` | Facturación del negocio / plan SaaS interno — **decisión** |

> Regla (cláusula 07): un feature que pida el PO de Total Dealer vive en Total One por flag;
> que además aparezca en NexQS lo decide Nexus. El roadmap de `PENDIENTES.md` es de NexQS.

## Implementación en producción

### Opción A — aplicar a un tenant (SQL, inmediato, sin deploy)
En la BD de producción (Render Postgres), por cada tenant Total One:
```sql
UPDATE tenants
SET plan = 'ENTERPRISE',
    enabled_modules = '["dashboard","clients","settings","cash-register","parts-inventory","quotes","workshop","reception","warranties","catalog","units-inventory","sales","sale-documents","purchases","warehouse","leads","used-units","cfdi","pld","reports"]'::jsonb
WHERE id = '<TENANT_ID>';
```

### Opción B — desde el portal admin
Admin (superadmin) → ficha del tenant → **Módulos**: plan `ENTERPRISE` y encender exactamente los 20 de la lista (dejar apagados bodywork, fleets, WhatsApp, finance, billing).

### Opción C — preset en código (recomendado para nuevos tenants)
Ya existe la constante `TOTAL_ONE_MODULES` (+ `modulesForEdition`) en `module-registry.ts`.
**Falta** conectarla al provisioning/alta de clientes: cuando la edición sea Total One, sembrar
`plan = ENTERPRISE` y `enabled_modules = modulesForEdition('total-one')` para que cada tenant
nuevo nazca con el preset sin configurarlo a mano. (Avisar para cablearlo en el wizard de alta.)

## Notas de afinación (del análisis DMS Lite)
- **Vertical maquinaria agrícola:** ajustar catálogo de unidades (serie/horas en vez de VIN/km) — trabajo de datos en `catalog`/`units-inventory`, no de módulos.
- **PLD importes altos:** validar umbrales de `pld` para venta de unidades/maquinaria.
- **Onboarding simplificado** para taller/lotero chico (menos opciones, catálogos base copiables).
- **Branding Total One** por dominio: ya implementado en web (`totalone.com.mx`) y admin (`admin.totalone.com.mx`).
