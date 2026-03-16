# NexDMS — UX Design & Data Quality System

> Este documento define los principios de interfaz y el sistema de calidad de datos.
> Cursor debe leer este archivo antes de implementar cualquier formulario, flujo o componente de UI.

---

## Filosofía de diseño

### Principios base
1. **Rapidez sobre estética** — menos clics, carga inmediata, tablas densas
2. **Permiso para avanzar, no para ignorar** — se puede crear un registro incompleto, pero no se puede cerrar un proceso sin los datos críticos de esa etapa
3. **El error se previene, no se castiga** — los campos requeridos se muestran antes de que el usuario los necesite, no después de que falla al guardar
4. **Contexto siempre visible** — el usuario nunca pierde de vista en qué OS, venta o cliente está trabajando
5. **Datos de calidad = futuros bots de IA** — cada campo mal llenado es basura que los modelos de IA no pueden procesar. La UI debe motivar llenado correcto, no solo permitirlo.

---

## Sistema de calidad de datos (Data Quality Score)

### Concepto
Cada entidad principal (Cliente, Vehículo, OS, Unidad) tiene un **score de calidad** del 0–100% calculado en base a los campos completados y su peso relativo.

### Niveles de calidad

| Nivel      | Score | Color               | Significado                          |
|------------|-------|---------------------|--------------------------------------|
| Básico     | 0–39% | Rojo `#E24B4A`      | Solo datos mínimos. Funcionalidad limitada |
| Parcial    | 40–69%| Ámbar `#BA7517`     | Operable pero con restricciones      |
| Operativo  | 70–89%| Verde `#639922`     | Funciona bien para operación diaria  |
| Completo   | 90–100%| Verde `#3B6D11`    | Listo para facturación y bots de IA  |

### Componente `DataQualityBar`
Aparece en:
- Header del perfil de cliente
- Header de cada OS
- Header de cada unidad del catálogo
- Dashboard (lista de registros con score bajo)

```html
<!-- Estructura del componente -->
<div class="data-quality-bar">
  <div class="dq-header">
    <span class="dq-name">Juan Pérez</span>
    <span class="dq-badge" [class]="badgeClass">{{ badgeLabel }}</span>
  </div>
  <div class="dq-bar">
    <div class="dq-fill" [style.width.%]="score" [style.background]="barColor"></div>
  </div>
  <div class="dq-missing-fields" *ngIf="missingRequired.length">
    Falta para facturar: {{ missingRequired.join(' · ') }}
  </div>
</div>
```

### Pesos de campos — Cliente

| Campo            | Peso | Tipo       | Impacto si falta                  |
|------------------|------|------------|-----------------------------------|
| nombre           | 10   | siempre    | Identificación básica             |
| telefono         | 10   | siempre    | Contacto y WhatsApp               |
| email            | 10   | operativo  | Envío de documentos               |
| rfc              | 25   | fiscal     | **Bloquea CFDI y garantías**      |
| curp             | 10   | fiscal     | Financiamiento y crédito          |
| direccion        | 10   | operativo  | Entrega y documentos              |
| vehiculo_registrado | 15 | operativo | Sin vehículo no hay OS ni historial |
| notas_relevantes | 10   | IA         | Contexto para bots                |

### Pesos de campos — Vehículo

| Campo         | Peso | Tipo    | Impacto                           |
|---------------|------|---------|-----------------------------------|
| marca         | 15   | siempre |                                   |
| modelo        | 15   | siempre |                                   |
| anio          | 10   | siempre |                                   |
| numero_serie  | 25   | siempre | **Bloquea garantías y CFDI**      |
| placa         | 15   | operativo|                                  |
| color         | 10   | operativo|                                  |
| km_actual     | 10   | operativo| Historial de mantenimiento        |

---

## Formularios progresivos por módulo

### Regla global
Los formularios de **creación** piden solo los campos mínimos (Fase 1).
Los campos adicionales se solicitan contextualmente cuando el flujo los necesita (Fase 2+).
**Nunca** un formulario de creación con más de 8 campos visibles simultáneamente.

### Cliente — fases de completado

**Fase 1 — Creación (mínimo para existir):**
```
Nombre* | Apellido* | Teléfono*
```

**Fase 2 — Para cotizar o agendar:**
El sistema muestra un banner: _"Agrega el vehículo del cliente para continuar"_
```
+ Tipo de vehículo* | Marca* | Modelo* | Año*
```

**Fase 3 — Para cerrar una OS o venta:**
El sistema muestra un banner: _"Se necesita email para enviar el comprobante"_
```
+ Email | Dirección
```

**Fase 4 — Para facturar (CFDI):**
El sistema muestra un blocker rojo: _"Se requiere RFC y régimen fiscal para timbrar"_
```
+ RFC* | Razón social* | Régimen fiscal* | CP*
```

---

## Bloqueos por etapa (gate system)

### Principio del gate
Cada transición de estado tiene un **gate** — una lista de campos que DEBEN estar completos para que el botón de avance esté habilitado.

Si un campo faltante es de otra entidad (ej: RFC del cliente), el sistema muestra el link directo: _"Completa el RFC de Juan Pérez →"_

### Gates de Orden de Servicio

| Transición                        | Gate — campos requeridos                                    |
|-----------------------------------|-------------------------------------------------------------|
| RECIBIDO → DIAGNOSTICO            | `falla_reportada`, `km_entrada`                            |
| DIAGNOSTICO → EN_PROCESO          | `mecanico_id`, `diagnostico`, `fecha_promesa`             |
| EN_PROCESO → EN_ESPERA_PARTES     | (libre — solo cambiar estado)                              |
| EN_ESPERA_PARTES → EN_PROCESO     | (libre)                                                    |
| EN_PROCESO → LISTO                | `trabajo_realizado`, `km_salida`                           |
| LISTO → ENTREGADO                 | `metodo_pago`, `costo_mano_obra` > 0                      |
| LISTO → ENTREGADO (con CFDI)      | + `cliente.rfc`, `cliente.regimen_fiscal`, `cliente.cp`  |

### Gates de Venta de Unidad

| Transición               | Gate                                                             |
|--------------------------|------------------------------------------------------------------|
| PROCESO → COMPLETADA     | `precio_final`, `metodo_pago` o `plan_pago_id`, `fecha_entrega` |
| COMPLETADA (con CFDI)    | + `cliente.rfc`, `catalogo_unidad.numero_serie`                |

### Gates de Orden de Compra

| Transición          | Gate                                        |
|---------------------|---------------------------------------------|
| BORRADOR → ENVIADA  | Al menos 1 línea de detalle               |
| ENVIADA → RECIBIDA  | Todas las líneas con `cantidad_recibida > 0` |

---

## Componentes UI requeridos

### 1. `DataQualityBar` (Angular component)
Inputs: `entityType: 'cliente'|'vehiculo'|'os'|'unidad'`, `entityId: string`
Outputs: `score: number`, `level: 'basico'|'parcial'|'operativo'|'completo'`, `missingFields: string[]`
Calcula el score consultando los campos de la entidad y aplicando los pesos definidos.
Muestra: barra de progreso coloreada + badge de nivel + lista de campos faltantes críticos.

### 2. `StageGate` (Angular component)
Inputs: `currentStatus`, `targetStatus`, `entityId`, `entityType`
Valida los gates antes de mostrar el botón de avance.
Muestra el botón deshabilitado con tooltip explicando qué falta.
Si el dato faltante está en otra entidad, muestra link directo.

### 3. `ProgressiveForm` (Angular component)
Un formulario que muestra solo los campos de la fase actual.
Conforme el usuario completa campos, desbloquea la siguiente sección.
Nunca muestra todos los campos de golpe.
Implementar con `FormBuilder` y secciones colapsables progresivas.

### 4. `InlineEditField` (Angular component)
Permite editar un campo individual desde la vista de detalle sin abrir un formulario completo.
Click en el valor → input inline → Enter para guardar → PATCH al API.
Usar para completar datos faltantes rápidamente desde el perfil.

### 5. `ContextHeader` (Angular component)
Header persistente dentro de cada proceso (OS, venta, cotización) que muestra:
- Folio del proceso
- Estado actual con color
- Cliente + vehículo (clickable)
- `DataQualityBar` condensada
- Acciones rápidas del estado actual

---

## Diseño visual — reglas específicas

### Layout general
- Sidebar fijo izquierdo (240px) con navegación por módulo
- Content area con header contextual sticky
- Tablas: siempre con paginación server-side, nunca cargar todo en memoria
- Máximo 10 columnas visibles en tabla — columnas adicionales en modal de detalle

### Colores de estado (semántica)
```
RECIBIDO         → azul     #185FA5 bg:#E6F1FB
DIAGNOSTICO      → ámbar    #854F0B bg:#FAEEDA
EN_PROCESO       → verde    #0F6E56 bg:#E1F5EE
EN_ESPERA_PARTES → coral    #993C1D bg:#FAECE7
LISTO            → verde    #3B6D11 bg:#EAF3DE
ENTREGADO        → gris     #444441 bg:#F1EFE8
CANCELADO        → rojo     #A32D2D bg:#FCEBEB

DISPONIBLE       → verde    #3B6D11 bg:#EAF3DE
APARTADO         → ámbar    #854F0B bg:#FAEEDA
VENDIDO          → gris     #444441 bg:#F1EFE8
```

### Tablas densas
- Font-size: 13px
- Row height: 40px
- Zebra striping: sí (`var(--color-background-secondary)` en filas impares)
- Columna de acciones siempre a la derecha, sticky
- Búsqueda: input en el header de la tabla, debounce 300ms
- Filtros: chips debajo del header, cada filtro activo como chip removible

### Formularios
- Label arriba del input, siempre
- Placeholder solo como hint de formato (ej: "RFC: XAXX010101000")
- Error message debajo del campo, en rojo, con icono
- Campos requeridos: asterisco rojo `*` junto al label
- Campos opcionales: "(opcional)" en gris junto al label
- Agrupar campos relacionados en secciones con `<fieldset>` visual (sin el elemento HTML)
- Botón primary siempre al final derecho, botón cancelar a su izquierda

### Feedback al usuario
- Toast de éxito: verde, esquina superior derecha, auto-dismiss 3s
- Toast de error: rojo, permanece hasta que el usuario lo cierra
- Loading states: skeleton loaders en tablas, spinner solo en botones de acción
- Confirmaciones destructivas: modal con texto de la acción a confirmar (no solo "¿Estás seguro?")
  - Ejemplo: _"¿Cancelar la OS-2024-0047 de Juan Pérez? Esta acción no se puede deshacer."_

### Accesibilidad mínima
- Todos los inputs con `aria-label` o `<label for>`
- Botones deshabilitados con `title` explicando por qué
- Colores de estado nunca como único indicador — siempre acompañados de texto
- Focus visible en todos los elementos interactivos

---

## Flujos críticos — especificaciones de UX

### Flujo: Nueva OS desde mostrador (happy path en < 60 seg)

1. Click "Nueva OS" en sidebar → modal de búsqueda de cliente
2. Búsqueda por nombre o teléfono con resultados en tiempo real (debounce 200ms)
3. Si el cliente existe → seleccionar → mostrar sus vehículos en el paso siguiente
4. Si no existe → botón "Crear cliente" abre mini-form inline (nombre + teléfono + marca/modelo)
5. Seleccionar vehículo (o "Agregar vehículo" con mismo mini-form)
6. Pantalla de OS: pre-llenada con cliente y vehículo. Solo falta: falla reportada + KM
7. Submit → OS creada, redirigir a detalle de la OS
8. Banner: _"OS creada. Asigna mecánico para iniciar diagnóstico →"_

**Total de pasos para el caso común:** 4 clics + 2 campos de texto.

### Flujo: Cierre de OS con CFDI

1. OS en estado LISTO → botón "Entregar y cobrar"
2. StageGate verifica: trabajo_realizado ✓, km_salida ✓, metodo_pago ?
3. Si falta método de pago → modal inline para seleccionarlo
4. Si falta RFC del cliente → banner: _"El cliente no tiene RFC. ¿Emitir solo ticket de cobro o completar datos fiscales?"_
   - Opción A: Solo ticket → continuar sin CFDI
   - Opción B: Completar RFC → inline form en el mismo modal, sin salir del flujo
5. Confirmación de cobro con resumen: total, método, cliente
6. Sistema genera ticket PDF + CFDI (si aplica) + envía WhatsApp
7. OS pasa a ENTREGADO

**Regla de oro:** El usuario nunca tiene que navegar a otra pantalla para completar un dato necesario en el flujo actual. Los datos faltantes se completan inline.

### Flujo: POS mostrador rápido

1. Barra de búsqueda de producto siempre visible y con foco
2. Búsqueda por SKU, código de barras o nombre
3. Enter / click → agrega al carrito
4. Carrito siempre visible en panel derecho
5. Botón "Cobrar" → selección de método de pago → confirmación
6. Impresión de ticket automática si hay impresora configurada

**Meta:** menos de 30 segundos del producto al ticket.

---

## Dashboard — widgets de calidad de datos

El dashboard del GERENTE y ADMIN incluye:

### Widget "Registros incompletos"
- Lista de clientes con score < 40% (Básico)
- Botón "Completar" lleva directamente al campo faltante
- Meta: cero clientes en nivel Básico al final del día

### Widget "OS sin mecánico asignado"
- Lista de OS en estado RECIBIDO o DIAGNOSTICO sin mecánico
- Botón de asignación rápida directamente desde el widget

### Widget "OS atrasadas"
- OS cuya `fecha_promesa` ya pasó y aún no están en LISTO o ENTREGADO
- Color rojo, ordenadas por retraso

### Widget "Alertas de stock"
- Partes con stock ≤ stock_mínimo
- Link directo a generar OC para esa parte

---

## Anti-patrones — nunca hacer esto

- **NO** mostrar formularios de 15+ campos en una sola pantalla
- **NO** validar solo al hacer submit — validar campo por campo al salir del foco
- **NO** usar "¿Estás seguro?" como confirmación — describir exactamente qué se va a hacer
- **NO** bloquear al usuario con un error modal sin decirle cómo resolverlo
- **NO** redirigir a otra pantalla para completar datos del flujo actual — hacerlo inline
- **NO** mostrar IDs técnicos (UUIDs) al usuario — siempre folios legibles
- **NO** dejar estados de carga sin feedback visual
- **NO** permitir cerrar un proceso si los campos del gate están vacíos — el botón se deshabilita, no falla después
