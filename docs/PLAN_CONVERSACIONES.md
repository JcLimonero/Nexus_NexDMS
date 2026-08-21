# Plan de Implementación — Conversaciones (WhatsApp)

## Objetivo

Darle backend real a la pantalla `apps/web/.../taller/conversaciones`, hoy 100 %
mock en memoria: persistir las conversaciones de WhatsApp, permitir que un asesor
tome una conversación y responda de verdad, y ligar las citas que salen del bot
con el chat que las originó.

La pantalla ya define el contrato que necesitamos
(`conversacion.model.ts`); el trabajo es hacer que ese contrato lo sirva el API
en vez de `conversaciones.mock.ts`.

---

## Estado actual

### Lo que sí existe

| Pieza | Dónde | Qué hace |
|-------|-------|----------|
| Webhook Meta | `whatsapp-bot.controller.ts` | GET verificación + POST mensajes entrantes |
| Bot de citas | `whatsapp-bot.service.ts` | Máquina de estados de 5 pasos (SERVICE→DATE→SLOT→NAME→CONFIRM) |
| Sesión del bot | Redis, `wabot:<phone>` | TTL 30 min, sólo para el flujo de agendado |
| Envío saliente | `notifications/providers/whatsapp.provider.ts` | `sendText()` (texto libre) y `send()` (plantilla) |
| Credenciales por sucursal | `branch_config.whatsapp_phone_id` / `whatsapp_token` | Cifradas con `EncryptionService` |
| Cita desde el bot | `appointments.service.createPublic()` | Se guarda como `origin = PUBLIC_PORTAL` |

### Lo que no existe

1. **No hay tabla de conversaciones ni de mensajes.** La sesión de Redis es un
   scratchpad del flujo de agendado, no una transcripción: expira a los 30 min y
   no guarda ni un solo mensaje. `portal_messages` es otra cosa (portal del
   cliente, colgado de una orden de servicio, sin relación con WhatsApp).
2. **No hay handoff.** Nada del lado del servidor sabe qué es "con asesor". El
   bot contesta siempre.
3. **No hay salida libre del asesor.** `sendText()` existe pero no hay endpoint
   autenticado que lo exponga.
4. **No hay liga cita ↔ conversación.** `AppointmentOriginEnum` sólo tiene
   `INTERNAL | PUBLIC_PORTAL`; una cita del bot es indistinguible de una del
   portal web, y no apunta al chat que la generó.
5. **El bot ignora imágenes.** El controller filtra `msg.type !== 'text'`.

### Fallas que hay que arreglar de paso

Salieron al auditar y son **bloqueantes** para poder persistir con `tenant_id`:

| # | Falla | Detalle |
|---|-------|---------|
| B1 | **El webhook no resuelve tenant** | `resolveBranch()` usa `WHATSAPP_BOT_BRANCH_SLUG` o *la primera sucursal activa de toda la base*. En un SaaS multi-tenant, todo mensaje entrante cae en una sucursal arbitraria. |
| B2 | **El provider ignora las credenciales por sucursal** | `WhatsAppProvider` lee `WHATSAPP_PHONE_ID`/`WHATSAPP_TOKEN` de env, aunque `branch_config` ya las guarda cifradas por sucursal. La BD está lista; el provider no la usa. |
| B3 | **El webhook no valida firma** | Meta manda `X-Hub-Signature-256`. Hoy sólo se valida el token del GET. El POST lo puede llamar cualquiera. |
| B4 | **El webhook no es idempotente** | Meta reintenta. Sin deduplicar por `message.id` se duplican mensajes en cuanto haya tabla. |

---

## Decisiones a tomar antes de empezar

| # | Decisión | Recomendación |
|---|----------|---------------|
| D1 | ¿Cómo enruta el webhook al tenant? | Por `value.metadata.phone_number_id` del payload de Meta. Requiere poder **buscar** sucursal por ese id. |
| D2 | `whatsapp_phone_id` está cifrado (AES-CBC, no determinista) → no se puede indexar ni buscar | Guardar el `phone_number_id` **en claro** con índice único y dejar cifrado sólo el `token`. El phone id no es secreto (identifica el número, no autoriza); el token sí. Alternativa: columna hash determinista. |
| D3 | Ventana de 24 h de Meta | El texto libre sólo se puede mandar dentro de las 24 h del último mensaje del cliente. Fuera de eso hay que usar plantilla aprobada. **El mock lo ignora** — hay que exponerlo en el API y bloquear el compositor en la UI. |
| D4 | ¿El bot sigue contestando cuando hay asesor? | No. En `WITH_AGENT` el bot se calla (si no, escribe encima de la persona). Es la regla más importante del handoff. |
| D5 | ¿Realtime o polling? | Polling (10–15 s) en la primera entrega. SSE/WebSocket después; no bloquea nada. |
| D6 | ¿Bot conversacional (LLM) como el mock? | **Sí: Gemini 2.5 Flash Lite multimodal en Vertex AI (GCP).** Decidido después de escribir este plan; ver la fase F7. No bloquea F0–F6, que son el canal y la bandeja. |

---

## Modelo de datos

### `whatsapp_conversations`

```
id                uuid pk
tenant_id         uuid not null        -- índice
branch_id         uuid not null        -- índice
client_id         uuid null            -- se liga cuando se identifica por teléfono
phone             varchar(30) not null -- E.164, sin máscara (la máscara es de UI)
contact_name      varchar(200) null    -- profile name de Meta, o el que dio el cliente
state             varchar(20) not null default 'BOT'
                  -- BOT | WITH_AGENT | BOOKED | CANCELLED | EXPIRED
escalation_reason varchar(30) null
                  -- ASKED_FOR_HUMAN | BOT_LOOPED | BOT_WAS_WRONG
assigned_user_id  uuid null            -- quién la tomó
appointment_id    uuid null            -- cita que salió de este chat
last_message_at   timestamp not null   -- para "hace 6 min" y para la ventana de 24h
last_inbound_at   timestamp null       -- ventana de 24 h de Meta
unread_count      int not null default 0
created_at / updated_at
```

Índices: `(tenant_id)`, `(branch_id, last_message_at DESC)`, `(branch_id, phone)` único parcial sobre conversaciones abiertas.

### `whatsapp_messages`

```
id             uuid pk
tenant_id      uuid not null
conversation_id uuid not null  -- FK ON DELETE CASCADE, índice
author         varchar(10) not null  -- customer | bot | agent
user_id        uuid null             -- sólo cuando author = agent
body           text null
attachment_key varchar(500) null     -- key en B2
attachment_type varchar(20) null     -- image | audio | document
wa_message_id  varchar(100) null     -- id de Meta, único → idempotencia
direction      varchar(3) not null   -- IN | OUT
status         varchar(20) null      -- SENT | DELIVERED | READ | FAILED
created_at     timestamp not null
```

Índices: `(conversation_id, created_at)`, único en `(wa_message_id)` donde no sea null.

### Cambios a tablas existentes

```sql
-- routing del webhook (D2)
ALTER TABLE branch_config ADD COLUMN whatsapp_phone_number_id varchar(50);
CREATE UNIQUE INDEX ... ON branch_config (whatsapp_phone_number_id) WHERE NOT NULL;

-- liga cita ↔ conversación
ALTER TYPE appointments_origin_enum ADD VALUE 'WHATSAPP_BOT';
ALTER TABLE appointments ADD COLUMN whatsapp_conversation_id uuid;
```

---

## Fases

### F0 · Enrutamiento y seguridad del webhook — ✅ hecho (`bff7023e`)

Sin esto no se puede persistir nada con `tenant_id` correcto.

- ✅ Migración: `whatsapp_phone_number_id` en `branch_config` + índice único (D2).
- ✅ `WhatsappRoutingService`: `phone_number_id` → `{ tenantId, branchId }`. Cache en Redis.
- ✅ `resolveBranch()` sale del servicio del bot; el branch llega como parámetro.
- ✅ `WhatsAppProvider`: resolver credenciales por sucursal (descifrar token de
  `branch_config`), con fallback a env sólo en desarrollo (B2).
- ✅ Validar `X-Hub-Signature-256` contra `WHATSAPP_APP_SECRET` (B3).
- ✅ Deduplicar por `message.id` de Meta (B4).
- ✅ Aceptar `type: 'image'` en el controller (aún sin descargar el media).

**Entregable:** el webhook sabe de qué tenant/sucursal viene cada mensaje y
rechaza lo que no venga firmado por Meta.

**Extras que salieron al implementar:**

- La sesión del bot se guarda por sucursal (`wabot:<branchId>:<phone>`), no
  sólo por teléfono: el mismo cliente puede agendar en dos sucursales del grupo.
- Al cambiar el número en Configuración se invalida la caché de ruteo —la del
  número viejo y la del nuevo— para que el cambio aplique de inmediato.
- El campo de la UI dejó de ser tipo `password`: ahora se muestra completo,
  porque hay que poder verificar contra Meta cuál quedó configurado.

**Pendiente de despliegue:** definir `WHATSAPP_APP_SECRET` en Render *antes*
del siguiente deploy. En producción, sin él, el webhook rechaza todo.
Y recapturar el `phone_number_id` de cada sucursal en Configuración.

### F1 · Persistencia de la conversación — ✅ hecho (`beec5e44`)

- ✅ Migración con las dos tablas nuevas.
- ✅ Entidades + `WhatsappConversationsModule`.
- ✅ `ConversationsService.recordInbound()` / `recordOutbound()`.
- ✅ El bot escribe: cada entrante y **cada respuesta del bot** quedan guardadas.
- ✅ Alta/reuso de conversación por `(branch_id, phone)`.
- ✅ Liga a `client_id` cuando el teléfono coincide con un cliente del tenant.
- ✅ Job de expiración: `BOT` sin actividad > 24 h → `EXPIRED`.

**Entregable:** cada chat de WhatsApp deja rastro. Todavía sin UI.

**Decisiones que se tomaron al implementar:**

- Del bot sólo se guarda lo que Meta aceptó. Si el envío falla, el mensaje no
  entra en la transcripción: quien la lea después debe ver lo que el cliente
  recibió, no lo que se intentó mandar.
- La liga con el cliente es por los **últimos diez dígitos**. Comparar el
  número completo no empata casi nunca (Meta antepone `521` en México y los
  teléfonos de `clients` los captura gente). Con dos clientes empatados no se
  adivina: se deja sin ligar.
- Si falla el agendado, la conversación **queda abierta** a propósito — el
  cliente quería una cita y no la tiene.
- La guarda de silencio del bot en `WITH_AGENT` se adelantó desde F3: todavía
  no hay forma de llegar a ese estado, pero la regla vive donde se decide
  contestar y así no se olvida.
- La ventana de expiración quedó en 24 h, que es la de Meta: pasada esa hora
  no se le puede escribir texto libre a esa persona de todos modos.

**Verificado contra Postgres** en una base desechable: las dos migraciones
suben y bajan, y el índice parcial rechaza la segunda conversación abierta del
mismo teléfono mientras deja convivir el histórico.

### F2 · API de lectura — ✅ hecho (`088d733b`)

| Método | Endpoint | Notas |
|--------|----------|-------|
| GET | `/api/v1/whatsapp/conversations` | Lista paginada. Filtros: `state`, `branchId`, `assignedUserId`, `q`. Ordena por última actividad |
| GET | `/api/v1/whatsapp/conversations/:id` | Detalle + transcripción |

- ✅ `AuthGuard` + `RolesGuard`. Roles: `SUPERADMIN, ADMIN, MANAGER, CASHIER,
  RECEPTIONIST` — **no existe el rol `ADVISOR`** que suponía el plan; son los
  mismos que ya usa citas.
- ✅ Filtrado por `tenantId` primero, luego `applyScope()`.
- ✅ El teléfono se enmascara en el DTO de salida, no en la BD.
- ✅ `canReplyFreeText` y `windowExpiresAt` (D3).

**Entregable:** la pantalla puede dejar de leer el mock para la lista y el detalle.

**Diferencias con lo planeado:**

- `lastMessageAt` sale en **ISO, no como "hace 6 min"**. Un relativo calculado
  en el servidor nace viejo: se queda escrito mientras la pantalla sigue
  abierta. Formatearlo es de la UI, que sí puede refrescarlo.
- La cita ligada sale como **objeto** (`id`, `scheduledAt`, `serviceType`,
  `status`), no como el folio `CITA-2481` del mock: `appointments` no tiene
  folio, sólo id, y no se va a inventar uno.
- La última línea de la lista se resuelve con `DISTINCT ON`: veinte filas son
  una consulta, no veinte.

**Verificado con el API corriendo** (base desechable, peticiones reales):
usuario de otra sucursal ve cero y recibe 404 en el detalle; usuario de otro
tenant ve cero aunque tenga scope global; `MECHANIC` recibe 403; la ventana de
24 h abre y cierra según el último mensaje del cliente.

> Ahí salió un error que las pruebas con query builder simulado no podían ver:
> `orderBy` con `skip`/`take` resuelve contra los metadatos de la entidad, así
> que `c.last_message_at` —que como propiedad no existe— daba 500 al paginar.
> **Al paginar hay que ordenar por nombre de propiedad**, no de columna.
> Conviene revisar si hay más casos así en el repo (`clients.service.ts:98`
> ordena por `c.first_name` con paginación).

### F3 · Handoff y respuesta del asesor — ✅ hecho (`a478289c`)

| Método | Endpoint | Efecto |
|--------|----------|--------|
| POST | `/whatsapp/conversations/:id/take` | `BOT` → `WITH_AGENT`, `assigned_user_id = user.sub` |
| POST | `/whatsapp/conversations/:id/messages` | Manda por Meta + persiste como `author = AGENT` |
| POST | `/whatsapp/conversations/:id/release` | Devuelve al bot |
| POST | `/whatsapp/conversations/:id/read` | Limpia `unread_count` |

- ✅ **Silenciar el bot en `WITH_AGENT`** (D4) — ya venía de F1.
- ✅ Ventana de 24 h validada **en el servidor**, no sólo en la pantalla.
- ✅ El envío usa credenciales de la sucursal de la conversación (F0).
- ✅ Un solo asesor a la vez: si ya está tomada por otro, 409.

**Entregable:** los dos botones que el commit `b9c72ace` agregó al front dejan
de ser de mentiras.

**Decisiones al implementar:**

- **Primero se manda, luego se guarda.** Sólo lo que Meta aceptó entra en la
  transcripción; si el envío falla no queda rastro. Un asesor no puede creer
  que el cliente leyó algo que nunca salió.
- Los rechazos llevan **`code`** además del mensaje (`ALREADY_TAKEN`,
  `NOT_TAKEN`, `WINDOW_CLOSED`, `SEND_FAILED`, `NO_CREDENTIALS`). La pantalla
  tiene que distinguirlos para decir qué hacer, y comparar contra el texto en
  español se rompe en cuanto alguien lo reescribe. El filtro global de
  excepciones ahora deja pasar ese campo.
- **Un responsable puede soltar la conversación de otro.** Si alguien se va a
  comer con tres tomadas, su jefe no debería tener que esperarlo.
- Tomar dos veces la propia **no falla**: la pantalla pudo quedarse atrás.
- `WhatsappRoutingService` se mudó a un módulo **`whatsapp-core`**: lo
  necesitan el webhook (para saber de quién es lo que entra) y la bandeja
  (para mandar la respuesta), y dejándolo en cualquiera de los dos quedaba un
  ciclo entre módulos.

**Verificado contra el API corriendo:** toma y relevo, `ALREADY_TAKEN` para el
segundo asesor, `NOT_TAKEN` al responder sin tomar, `WINDOW_CLOSED` a las 30 h
sin siquiera llamar a Meta, `NO_CREDENTIALS` sin configuración, y con
credenciales inválidas `SEND_FAILED` **sin guardar ningún mensaje**.

> Falta probar el envío que Meta sí acepta: hace falta un número real.

### F4 · Escalamiento y liga con citas

- Detección de `escalation_reason` en el bot:
  - `ASKED_FOR_HUMAN` — frases tipo "asesor", "una persona", "humano".
  - `BOT_LOOPED` — el bot repite el mismo paso N veces seguidas.
  - `BOT_WAS_WRONG` — no se puede detectar solo; lo marca el asesor al tomar
    la conversación (parámetro opcional en `/take`).
- Cuando escala: notificar a los asesores de la sucursal (`NotifListener`).
- `AppointmentOriginEnum.WHATSAPP_BOT` + `whatsapp_conversation_id`.
- `createPublic()` recibe y guarda la conversación de origen.
- La conversación pasa a `BOOKED` al confirmar la cita, y a `CANCELLED` si se
  cancela.

**Entregable:** la métrica que el modelo promete ("X de Y escalaron") sale de
datos reales, y se puede contestar "¿cuántas citas trae WhatsApp?".

### F5 · Media entrante — *ya no es opcional*

- Descargar el media de Meta (`/{media_id}` → URL temporal, requiere el token).
- Subir a B2 vía `StorageService`; guardar la key.
- Endpoint de URL firmada para que la UI la pinte.
- Límite de tamaño y tipos permitidos.

> **Cambió de prioridad con D6.** Se había marcado como posponible porque sin
> ella la burbuja muestra un placeholder y ya. Con un asistente multimodal la
> foto deja de ser un adjunto que se archiva y pasa a ser *entrada del modelo*:
> el testigo del tablero, el golpe en la salpicadera. F5 se vuelve requisito de
> F7, no un extra.

### F7 · El asistente de verdad — Gemini 2.5 Flash Lite en Vertex AI

Es lo que cierra la distancia entre la pantalla y el producto: el mock dibuja un
asistente que entiende cómo habla la gente y lee fotos; el que corre hoy manda
menús numerados y sólo entiende dígitos y `AAAA-MM-DD`.

**Lo que se tira:** la máquina de estados de `whatsapp-bot.service.ts`
(`SERVICE→DATE→SLOT→NAME→CONFIRM`) y su sesión en Redis. Eso se sostenía porque
no había memoria; ahora la hay.

**Lo que ya quedó listo sin buscarlo:** la transcripción de F1 es el contexto
del modelo. `whatsapp_messages` deja de ser sólo lo que lee el asesor y pasa a
ser la memoria de la conversación.

#### Reglas que no se negocian

1. **El modelo no inventa datos del taller.** Precios, horarios y citas salen de
   *function calling* contra los servicios que ya existen
   (`UserAvailabilityService.getAvailableSlots`,
   `AppointmentsService.createPublic`, catálogo de `service_types`). El caso
   `wa-005` del mock —el asistente cotizando $2,300 cuando eran $3,900— es
   exactamente el fallo que un LLM sin herramientas comete solo.
2. **Escribir siempre pasa por herramienta.** El modelo nunca toca la base
   directo; propone una llamada y el API la valida con las mismas reglas que
   usa un humano.
3. **La ventana de contexto se acota.** El costo por turno crece con la
   transcripción. Últimos N mensajes + resumen de lo anterior, no el hilo
   completo cada vez.
4. **El handoff lo puede pedir el modelo**: una herramienta
   `escalate_to_human(reason)` que escribe `escalation_reason`. Encaja con F4 y
   es más fiable que adivinar desde fuera.

#### Decisiones abiertas

| # | Decisión | Nota |
|---|----------|------|
| G1 | ¿Proyecto GCP por tenant o uno de Nexus Q Tech? | Uno solo es más simple y barato; por tenant aísla costos y cuotas. Lo que sí es por sucursal es el *prompt* y el catálogo. |
| G2 | Región de Vertex | Datos de clientes mexicanos. Elegir región y dejar por escrito qué sale del país, que es cláusula de contrato con el grupo. |
| G3 | ¿Cómo se prueba? | Un LLM no se prueba con `expect(...)`. Hace falta un set de conversaciones reales y una forma de medir si agendó bien, no sólo si respondió. |
| G4 | Límite de gasto | Por tenant y por conversación. Un bucle con un cliente insistente no puede costar lo que un servicio mayor. |

#### Riesgo mayor

El asistente habla **a nombre del taller**. Lo que prometa —un precio, una
fecha, una garantía— el cliente lo va a cobrar. Antes de encenderlo en
producción hay que decidir qué tiene permitido afirmar y qué tiene que derivar
a una persona, y eso es una decisión del negocio, no del prompt.

### F6 · Front — quitar el mock — ✅ hecho (`ed1df81d`)

- ✅ `ConversacionesService` con `HttpClient` sobre `/api/v1/whatsapp/conversations`.
- ✅ `conversaciones.mock.ts` borrado; `conversacion.model.ts` se queda, ahora
  como contrato del API.
- ✅ Estados de carga/error y sondeo cada 15 s (D5).
- ✅ Compositor apagado con el motivo visible cuando `canReplyFreeText` es false.
- ✅ Fuera el badge "Datos de demostración", el `demoOnlyGuard` de la ruta y la
  entrada condicional del menú.

**Decisiones al implementar:**

- **Se quitó el badge "N de M escalaron".** Nada llena `escalation_reason`
  todavía (eso es F4), así que hoy sería siempre cero. Vuelve con F4.
- El contador de "esperando asesor" sale de `meta.total` con filtro de estado,
  no de contar la página cargada: al paginar darían números distintos.
- Al responder se agrega al hilo **el mensaje que devolvió el servidor**, no el
  que se escribió. Si el envío falla no aparece nada y el borrador se conserva
  para reintentar.
- El botón de responder sólo sale en la conversación propia; si la tomó alguien
  más, se ve su nombre.

**Probado en el navegador** contra el API corriendo: lista ordenada y con
teléfono enmascarado, negritas de WhatsApp pintadas, tomar → cambia de estado y
aparece el compositor, soltar → vuelve al asistente, ventana vencida → compositor
bloqueado con su explicación, envío rechazado → el hilo queda intacto y sale el
motivo.

> `shared/utils/demo-mode.ts` quedó **sin usar**: Conversaciones era su único
> consumidor. Se deja porque es un mecanismo pensado para futuras pantallas de
> demostración, pero si no se va a usar, sobra.

---

## Orden sugerido

```
F0 ✅ ──► F1 ✅ ──► F2 ✅ ──► F3 ✅ ──► F6 ✅ (front conectado)
                                 └──► F4 (escalamiento y citas)
                                      F5 (media) ──► F7 (Gemini)
```

**Estado: la pantalla funciona de punta a punta.** Un cliente escribe por
WhatsApp, la conversación se guarda, el asesor la ve en la bandeja, la toma y
le responde. Falta el asistente (F7), el escalamiento (F4) y las fotos (F5).

F0 y F1 no tienen nada visible: son la mitad del trabajo y toda la deuda. F2+F3
es lo que hace que la pantalla exista de verdad. F4 suma valor pero no bloquea.

F5 dejó de ser independiente: con un asistente multimodal, la foto es entrada
del modelo y no un adjunto, así que va antes de F7.

**Siguiente paso recomendado: F6.** Con F0–F3 el backend ya sostiene la
pantalla completa; conectarla cierra el ciclo y deja algo que se puede enseñar
y usar. F7 es el proyecto grande y conviene empezarlo con la bandeja ya
funcionando, porque es donde se va a ver si el asistente lo está haciendo bien.

---

## Riesgos

- **Ventana de 24 h (D3).** Es la que más va a doler en operación: el asesor
  escribe, ve el mensaje en pantalla y Meta lo rechaza. Hay que validarlo en el
  API *antes* de pintar la burbuja optimista.
- **Un solo número por sucursal.** El modelo asume `phone_number_id` único por
  sucursal. Si un grupo comparte número entre sucursales, el enrutamiento por
  `phone_number_id` no alcanza y hay que desambiguar por otra vía.
- **Distancia mock ↔ realidad (D6).** La pantalla promete un asistente que
  conversa; el bot real manda menús numerados. Conectar el API va a hacer
  evidente el contraste, y va a seguir así hasta F7. Conviene alinear
  expectativas antes de la demo: lo que ya funciona es el canal y la bandeja,
  no el asistente.
- **Mensaje obsoleto.** El bot contesta hoy "por ahora sólo puedo leer mensajes
  de texto" cuando llega una foto (F1). Con F5+F7 eso deja de ser cierto y hay
  que quitarlo.
- **`WHATSAPP_BOT_BRANCH_SLUG`** queda obsoleto al terminar F0; hay que
  retirarlo de `.env.example` y del deploy.
