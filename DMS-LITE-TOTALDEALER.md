# DMS Lite (Total Dealer) — spec y análisis de brecha

Requerimiento de **Total Dealer**: un "DMS Lite" en modalidad SaaS, operado bajo la
arquitectura de NexDMS/NexQS, para **talleres, loteros y comercializadores de maquinaria**.
Objetivo: un MVP para instalar un piloto o arrancar un taller.

> **Nombre comercial de la edición de Total Dealer: "Total One".** Dominio: **`totalone.com.mx`**
> (validar marca registrada / IMPI). Alternativa para el piloto: subdominio de `totaldealer.com`.
>
> **Soporte (reglas):** Nivel 1 (uso, capacitación, cobranza) lo da Total Dealer; Nivel 2
> (bugs, datos, estabilidad/infraestructura de la plataforma) lo da Nexus por escalamiento.
> SLA de primera respuesta por plan: Básico 8 h, Intermedio 4 h, Premium 2 h hábiles.
> Horario L–V 9:00–18:00 (centro); caídas críticas de plataforma, atención de Nexus fuera de
> horario. Desarrollos a la medida se cotizan aparte (no son soporte).
>
> **Desempate:** cualquier decisión en la que no se llegue a un acuerdo la resuelve **Nexus**
> (última palabra). Evita el bloqueo del 50/50 y mantiene el control del rumbo en el dueño del código.

> **Conclusión rápida:** lo que piden **ya existe casi en su totalidad** en la plataforma.
> No es "construir módulos", es **empaquetar una edición Lite** (preset de módulos + afinar
> el vertical de maquinaria). Ver recomendación al final: **edición/preset, no producto forkeado**.

## Módulos solicitados por Total Dealer

- **Caja, Facturación y Presupuestos** — facturación electrónica nativa (CFDI) conectada al SAT donde convergen ventas, servicios y refacciones; caja con apertura, movimientos y corte por turno.
- **Almacén y Refacciones** — venta de mostrador, abastecimiento por compras a proveedores, y movimientos críticos de inventario: traspasos, ajustes y devoluciones.
- **Compliance y Legalidad** — compra/venta de unidades para loteros o comercializadores de maquinaria agrícola dentro de la Ley, considerando los importes altos.
- **Flujos operativos extra** — CRM (captación de leads en pre-venta), encuestas de satisfacción en post-venta, venta de unidades (nuevos y usados con flujos de recompra), y Servicio/Reparación (órdenes de servicio, cotizaciones por trabajos extra y garantías).

## Análisis de brecha — qué ya existe en el código

| Requisito Total Dealer | Módulo(s) en el repo | Estado |
|---|---|---|
| Caja: apertura, movimientos, corte por turno | `cash-register` (incl. `corte-pdf.service.ts`) | ✅ Existe |
| Facturación CFDI nativa conectada al SAT | `cfdi`, `cfdi-log` (vía PAC/FacturAPI) | ✅ Existe |
| Presupuestos / cotizaciones | `quotations` | ✅ Existe (falta PDF, ya en pendientes) |
| Convergencia ventas + servicios + refacciones en factura | `sales`, `service-orders`, `parts` | ✅ Existe |
| Venta de mostrador | `parts`, `sales`, `price-lists` | ✅ Existe |
| Compras a proveedores / abastecimiento | `purchase-orders`, `purchase-requisitions`, `suppliers` | ✅ Existe |
| Traspasos de inventario | `warehouse-transfers` | ✅ Existe |
| Ajustes de inventario / conteos | `stock-movements`, `stock-counts` | ✅ Existe |
| Devoluciones | `part-returns` | ✅ Existe |
| Ubicaciones de almacén | `stock-locations`, `unit-locations` | ✅ Existe |
| Compliance PLD (importes altos) | `pld` | ✅ Existe — validar umbrales para maquinaria |
| Legalidad en venta de unidades | `legal-entities`, `sale-documents`, `unit-sale-extras`, `unit-return-documents` | ✅ Existe |
| CRM: leads de pre-venta | `leads` | ✅ Existe |
| Encuestas post-venta | `surveys`, `sale-surveys` | ✅ Existe |
| Venta de unidades nuevos y usados | `unit-sales`, `used-units`, `catalog-units`, `sales` | ✅ Existe |
| Flujos de recompra | `unit-returns` | ✅ Existe |
| Servicio/reparación: órdenes | `service-orders`, `service-phases`, `mechanic-checklist` | ✅ Existe |
| Cotizaciones por trabajos extra (ligadas a OS) | `quotations` | ✅ Existe |
| Garantías | `warranties` | ✅ Existe |

**Veredicto:** ~95% del alcance del MVP ya está en la plataforma. No estamos "lejos" — estamos a distancia de **configuración + afinación**, no de desarrollo de módulos.

## Lo que sí falta (trabajo real, acotado)

- [ ] **Vertical de maquinaria agrícola** — el catálogo de unidades está pensado para autos (VIN, marca/modelo/versión). Para maquinaria hay que revisar campos (número de serie/motor en vez de VIN, categorías/tipos propios, horas de uso en vez de km). Trabajo de catálogo, no de arquitectura. Módulos base: `catalog-units`, `vehicle-types`, `vehicle-categories`, `master-catalogs`.
- [ ] **Edición "Lite" (preset de módulos)** — definir el bundle de módulos activos y **ocultar lo de agencia** (F&I, multimarca, etc.). El toggle de módulos por tenant ya existe (`modules` + `saas`/provisioning + diálogos de módulos en la ficha de empresa); es cuestión de crear el preset.
- [ ] **PDF de cotización/presupuesto** — ya está en pendientes (Documentos/PDF); es el documento que el taller/lotero más imprime y manda.
- [ ] **PLD para importes altos de unidades** — validar que las reglas/umbrales de `pld` apliquen a la venta de unidades y maquinaria (no solo efectivo), por los montos que menciona Total Dealer.
- [ ] **UI/onboarding simplificado** para el persona Lite (taller/lotero chico): menos opciones, arranque rápido, catálogos base copiables (ya existe el wizard de alta con catálogos base).
- [ ] **Co-marca / white-label** si Total Dealer lo requiere (branding por tenant ya existe: `tenants/branding.paletas.ts`).

## Recomendación: edición, NO producto forkeado

**No crear un producto lateral con base de código separada.** Ese es el error clásico: duplicas mantenimiento, y cada arreglo/feature hay que hacerlo dos veces. En su lugar:

- **"DMS Lite" = una edición/preset de la misma plataforma NexQS** — mismo código, distinto bundle de módulos, pricing y (si se quiere) marca. La plataforma ya es multi-tenant con toggles de módulos por tenant, así que Lite es literalmente un preset + branding.
- **Ventaja para vender el piloto:** podemos decirle a Total Dealer "lo que piden ya existe; es empaquetar, no construir" → **piloto en semanas, no meses**.
- **Co-marca reversible** si lo quieren con su nombre: white-label sobre el mismo core, sin fork.
- **Un solo backlog:** lo que construimos para talleres/lotes de NexQS sirve al Lite y viceversa.

**Cuándo sí un producto separado:** solo si Total Dealer exige despliegue/infra aislada por contrato. Aun así sería *white-label del mismo core*, no una segunda base de código.

## Acuerdo propuesto por Total Dealer (borrador) — análisis para socios de Nexus

**Términos que propone TD:**
- Reparto **50/50** de gastos, costos de desarrollo y utilidades. **TD no aporta capital de entrada.**
- **TD aporta:** un Product Owner con experiencia (aporta estructura, ayuda a terminar el software, define el roadmap) + **fuerza de ventas en exclusiva** del DMS Lite.
- **Nexus aporta:** todo el desarrollo continuo, la integración de nuevas funcionalidades, y la estabilidad de la plataforma SaaS.
- **Monetización:** suscripción recurrente + motor propio de control de suscripciones con **bloqueo escalonado** por falta de pago (alertas → restricción escalonada → reactivación inmediata al pagar).
- **Proyección (foto a 50 talleres, ~500 usuarios):** ingreso bruto $180,000/mes; menos nube $13,000 = "utilidad bruta" $167,000; reparto ~$83,500 por socio. Planes: Premium $5,000 (50%), Intermedio $3,000 (30%), Básico $1,000 (20%).
- **Cláusula 07:** Nexus se reserva el derecho de comercializar una **versión propia e independiente** por sus canales, que no necesariamente tendrá las mismas funcionalidades desarrolladas para el DMS Lite de TD.

**Lectura honesta (interna):**

- ✅ **El vehículo es el correcto.** Esto es un *profit-share sobre una línea de producto*, NO vender acciones de Nexus. Es muchísimo mejor que el "50% de la empresa por $50k" que se habló antes. **La cláusula 07 es la joya** — protege el derecho de Nexus a vender su propia versión; hay que mantenerla y reforzarla.
- ⚠️ **Trato desbalanceado en aportación.** El producto **ya está ~95% construido por Nexus**. Nexus llega con el activo hecho + infra + todo el desarrollo futuro; TD aporta un PO + ventas. Es **50% de utilidades a cambio de distribución**. Se justifica SOLO si TD abre un mercado que Nexus no alcanzaría solo; pero Nexus *sí puede* vender por canal propio (cláusula 07 + el plan de canal) — o sea, no es "50% de cero".
- ⚠️ **Las finanzas están infladas.** El "$83,500 por socio" **no es utilidad real**: solo resta la nube. Ignora soporte, timbres CFDI, comisiones de pago, cobranza, administración y el costo de la fuerza de ventas, y el desarrollo va "aparte al 50%". El propio texto dice "antes de costos adicionales". Utilidad real por socio: probablemente 40–60% de esa cifra. Además es la foto de 50 talleres **ya vendidos y pagando**, no el *ramp* para llegar ahí.
- ⚠️ **Nexus pierde por partida doble en desarrollo.** Incurre el costo de dev, recupera solo 50%, y encima cede 50% de la utilidad. Debe ser una cosa o la otra: cobrar el dev completo, **o** compartir utilidad — no las dos mitades malas.
- ⚠️ **Sin mínimos, sin vesting, sin plazo.** El 50/50 es plano y no está condicionado a que TD venda. Si su fuerza de ventas no rinde, Nexus igual cede la mitad. **Atar el 50% a mínimos de ventas**, con ajuste del split si no se cumplen.
- 🔴 **IP: lo más importante y no aparece.** ¿Quién es dueño del código? Nexus lo construyó. El acuerdo **debe** decir explícito que Nexus es dueño del core y el DMS Lite es una edición/licencia. Sin esto, nada más importa.
- ⚠️ **Control del roadmap.** Que el PO de TD "defina el roadmap" es mucho poder para quien no pone capital. Acotar: el PO prioriza features del DMS Lite, **no** manda sobre el core ni sobre la versión independiente de Nexus.
- ⚠️ **Reconciliar "exclusiva" con la cláusula 07.** Definir con nitidez la frontera entre el DMS Lite (marca/edición que TD vende en exclusiva) y la versión independiente de Nexus (otros canales, otras features), o se canibalizan.

**Postura recomendada:** el vehículo se acepta; los términos se negocian **desde la fuerza** (el producto ya existe, es el activo de Nexus). Contrapropuesta: (1) IP del core = Nexus; (2) 50/50 de utilidad condicionado a **mínimos de ventas de TD**; (3) desarrollo facturado correctamente; (4) alcance del PO acotado al Lite; (5) finanzas re-modeladas con *ramp* y todos los costos; (6) cláusula 07 fuerte y con IP claro.

## Clasificación de módulos por edición (visibilidad / feature flags)
Cada módulo se marca como visible en **Total One (TO)**, **NexQS (NX)** o **Ambos**. NexQS es el
superset; Total One es el subconjunto operativo (talleres/loteros/maquinaria). El core lo comparten
ambos. Esta tabla es la base para los *feature flags* por edición.

| Módulo / Área | Total One | NexQS | Nota |
|---|:---:|:---:|---|
| Clientes, vehículos/unidades | ✅ | ✅ | Core |
| Usuarios, roles, sucursales | ✅ | ✅ | Core |
| Caja (apertura/movimientos/corte) | ✅ | ✅ | Core |
| Facturación CFDI (Mega Invoice) | ✅ | ✅ | Core |
| Presupuestos / cotizaciones | ✅ | ✅ | Core |
| Ventas / punto de venta | ✅ | ✅ | Core |
| Almacén y refacciones (compras, traspasos, ajustes, devoluciones) | ✅ | ✅ | Core |
| Servicio / órdenes / citas / garantías | ✅ | ✅ | Core |
| Venta de unidades (nuevos, usados, recompra) | ✅ | ✅ | Core |
| Compliance / PLD / legalidad | ✅ | ✅ | Core |
| CRM básico (leads pre-venta) | ✅ | ✅ | Core |
| Encuestas post-venta | ✅ | ✅ | Core |
| Dashboard / reportes | ✅ | ✅ | Core |
| Motor de suscripción + bloqueo escalonado | ✅ | ✅ | Nace por Total One; útil para ambos |
| Vertical maquinaria agrícola | ✅ | ➕ | Impulsado por Total One; NexQS lo puede ofrecer |
| Hojalatería y pintura (colisión) | ❌ | ✅ | Oculto en TO (salvo que el PO lo pida) |
| Monitores (taller / citas) | ❌ | ✅ | Oculto en TO |
| Asistente IA (OpenRouter) | ❌ | ✅ | Oculto en TO |
| WhatsApp / bandeja de conversaciones | ❌ | ✅ | Oculto en TO |
| CRM avanzado (embudo Kanban, campañas, retención, NPS, SLA) | ❌ | ✅ | Oculto en TO |
| Agente conversacional (orquestador) | ❌ | ✅ | Oculto en TO |
| Contabilidad / export (CONTPAQi/ASPEL) | ❌ | ✅ | Oculto en TO |
| Pasarela de pago self-service | ❌ | ✅ | En TO, solo lo básico para cobro (p. ej. QR de pago) |
| F&I avanzado (financiamiento/seguros) | ❌ | ✅ | Oculto en TO |
| Multimarca / consolidado de grupo | ❌ | ✅ | Oculto en TO |
| Flotillas (fleets) | ❌ | ✅ | Oculto en TO |
| Portal de cliente / portal público | ❌ | ✅ | Oculto en TO (evaluar) |
| Features exclusivas a petición del PO de TD | ✅ | ❔ | Solo TO por defecto; Nexus decide si además van a NexQS (cláusula 07) |

Leyenda: ✅ visible · ❌ oculto · ➕ disponible/opcional · ❔ a decisión de Nexus.
**Regla:** un feature que el PO de TD pida vive en Total One por *feature flag*; que además aparezca
en NexQS lo decide Nexus (dueño del código).

## Alcance de features: roadmap = NexQS; Total One = alcance actual
- **El plan de features nuevos (`PENDIENTES.md`) es de NexQS**, la versión independiente de Nexus (cláusula 07).
- **Total One = el producto que tenemos hoy** (el alcance DMS Lite ya construido). No hereda automáticamente el roadmap de NexQS.
- Lo que el Product Owner de Total Dealer solicite para Total One se construye **a petición y por acuerdo**; se factura como desarrollo (no es soporte) y Nexus decide si además lo incorpora a NexQS.
- Los *feature flags* por edición son los que permiten que una función viva en NexQS y no en Total One (o viceversa) desde una sola base de código.

## Arquitectura de despliegue (dos ediciones, una base de código)
El frontend llama al API con rutas **relativas** (`/api/...`) y cada `vercel.json` reescribe `/api/*`
al mismo backend de Render. Por eso una edición nueva es **otro proyecto de Vercel apuntando al
mismo API** — no un fork. Además, al pasar por el rewrite, las **cookies de sesión quedan de primer
nivel en cada dominio** (no se cruzan) → base para administraciones independientes.

**Fase 1 — portal en vivo (sin código):**
- App portal = `apps/web` (DMS operativo). Se le agregó `apps/web/vercel.json` (output `dist/web/browser`, rewrite a `nexdms-api.onrender.com`).
- En Vercel: nuevo proyecto desde el mismo repo, Root Directory `apps/web`, dominio `app.totaldealer.com` (CNAME en el DNS de Total Dealer).
- Funciona contra el mismo API, pero se ve con marca NexQS y sin separación de administración.

**Fase 2 — edición real Total One (dev pendiente):**
- **Kit de marca en el repo:** `apps/web/public/brand-totalone/` y `apps/admin/public/brand-totalone/` (logos horizontal/vertical/wordmark, isotipo "O", favicons, CSS y manifiesto). Paleta Total One: gris azulado `#2B4149`, naranja `#EA4B17`, blanco `#FFFFFF`.
- **Marca por dominio:** en el arranque, según `window.location.hostname`, cargar logo/colores/favicon/título de Total One (desde `brand-totalone/`) en lugar de los de NexQS (`brand/`).
- **Preset de módulos Total One:** encender solo los del alcance, ocultar el resto (feature flags/edición).
- **Scope por socio (admin independiente):** el admin de TD ve solo sus tenants; Nexus conserva vista maestra para conciliar el 50/50 y dar soporte. Repetir el despliegue con `apps/admin` en `admin.totaldealer.com`.

> Nota: `apps/citas` no tiene `package.json`/`angular.json` propio (solo `dist/` prebuild); si se quiere como portal aparte, primero hay que darle build propio.

## Siguientes pasos sugeridos para el MVP/piloto

1. Definir el **preset de módulos "Lite"** (encender los de la tabla, apagar lo de agencia).
2. Afinar el **vertical maquinaria** (catálogo de unidades y campos).
3. Cerrar **PDF de cotización** y validar **PLD** para importes altos.
4. Simplificar **onboarding** para el persona Lite.
5. Instalar **piloto** con un taller/lotero real y medir.
