# Pendientes — NexQS

Lista viva de lo que falta, para no perderlo entre sesiones. Marca con `[x]` lo hecho.

> **Alcance:** este roadmap de features es de **NexQS** (la versión independiente de Nexus).
> **Total Go** (edición de Total Dealer) = el alcance actual/DMS Lite; lo que el PO de TD pida se
> construye por acuerdo y se separa por *feature flags*. Ver [DMS-LITE-TOTALDEALER.md](DMS-LITE-TOTALDEALER.md).

## Landing (`apps/landing`)
- [ ] **Monitor de citas** — agregar el mock/sección en la landing.
- [ ] **Plataforma de pago configurable** — beneficio en la landing (el cliente elige y configura su pasarela).
- [ ] **Logo definitivo** — reemplazar el placeholder (barra, footer, favicon) cuando llegue de la IA de imágenes.
- [x] **Landing en la raíz** — se sirve desde el admin como `/inicio.html`; la raíz sin sesión cae ahí y con sesión va al panel. Sin tocar Vercel.
- [ ] **Ojo: hay dos copias** de la landing — `apps/admin/public/inicio.html` (la que está en vivo) y `apps/landing/index.html` (standalone). Mantenerlas en sync o consolidar en una sola.

## Producto (features nuevos)
- [ ] **Pasarela de pago self-service** — el tenant elige su plataforma de pago y la **configura él mismo** desde su panel (hoy solo Conekta). Backend + UI.
- [ ] **Asistente IA sobre sus datos** — agente que responde sobre ventas/taller/inventario del tenant, usando **su propia cuenta de OpenRouter** (bring-your-own-key). Ya anunciado en la landing.
- [ ] **Monitor de citas (producto)** — ya existe `/monitor/citas`; validar/ampliar si hace falta.
- [ ] **Contabilidad / integración contable** — **alcance decidido: opción (a) exportar** (no contabilidad propia ni API por ahora). Generar pólizas, catálogo de cuentas y reportes en los **formatos de importación** que aceptan las paqueterías más comunes (CONTPAQi Contabilidad, ASPEL SAE/COI, etc.): archivos XML/TXT que el contador sube a su sistema. Primer paso al retomarlo: relevar el formato exacto de importación de cada paquetería.

## DMS Lite (Total Dealer)
Spec de Total Dealer + análisis de brecha en **[DMS-LITE-TOTALDEALER.md](DMS-LITE-TOTALDEALER.md)**.
Resumen: ~95% de los módulos ya existen; es empaquetar una **edición Lite** (preset), no forkear.
Pendiente real: vertical maquinaria, preset de módulos, PDF de cotización, PLD importes altos, onboarding Lite.

## Liberación de orden de servicio — QR al cliente
- [ ] Al **liberar** una orden de servicio / taller, ofrecer **enviar un QR al cliente** con dos usos:
  - **Salida del taller** — el cliente/valet muestra el QR y el guardia/recepción valida que la unidad está liberada (pagada o autorizada su salida). Registrar quién y cuándo escaneó.
  - **Pago** — el QR lleva a la pantalla de pago en línea (ligado a la pasarela self-service del tenant) para liquidar antes de salir.
  - Consideraciones: QR con token firmado y caducidad, un solo uso para salida; validación desde recepción/PWA; que funcione aunque el cliente no tenga la app (link web). Ligar con [documentos/PDF] y con la pasarela de pago.

## Documentos / PDF (cotizaciones, órdenes de servicio, etc.)
Revisar y homologar **cómo se generan los PDF** del sistema. Estado actual: se arman
**ad-hoc con `pdfkit`**, un servicio por documento y sin plantilla común.
- Hoy existe: `service-orders/orden-pdf.service.ts` (orden de servicio) y `cash-register/corte-pdf.service.ts` (corte de caja).
- [ ] **Cotización sin PDF** — el módulo `quotations` no genera PDF todavía; agregarlo (es de los documentos que más se imprime/manda al cliente).
- [ ] **Revisar el enfoque de generación** — decidir si seguimos con `pdfkit` (dibujo manual, difícil de mantener/estilizar) o pasamos a **HTML → PDF** (plantilla + motor tipo Puppeteer/renderer) para poder maquetar con CSS y reutilizar diseño.
- [ ] **Plantilla común + branding del tenant** — encabezado con **logo, colores y datos fiscales** del tenant (ya hay `tenants/branding.paletas.ts`); que cotización, orden de servicio, corte, etc. compartan cabecera/pie y estilo.
- [ ] **Cobertura por módulo** — definir qué documentos deben tener PDF: cotización, orden de servicio (taller y H&P), presupuesto de colisión, corte de caja, y comprobantes/recibos. (El CFDI ya lo entrega el PAC; aquí es el PDF **operativo/interno**, no el fiscal.)
- [ ] **Consistencia de folios** — usar el código legible (prefijo empresa + objeto + consecutivo) en el PDF, no el GUID.
- [ ] **Entrega** — descargar / imprimir / adjuntar a WhatsApp o correo desde la misma acción.

## CRM — roadmap y empaquetado
Hoy existe: `leads` (etapas, actividades, convertir a cliente), `surveys`/`sale-surveys`,
`commissions` y **WhatsApp** (pero vive en Taller: `/workshop/whatsapp/*`).

**Integrado (va en el CRM/base, no se cobra aparte — es dato y detona adopción):**
- [ ] **Vista 360 del cliente** — vehículos, órdenes, compras, cotizaciones, pagos, conversaciones y encuestas en una sola ficha.
- [ ] **Embudo de ventas (Kanban)** — leads por etapa con arrastrar; parte del módulo `leads`.
- [ ] **Origen del lead + conversión básica** — de dónde vino y conversión por fuente/asesor.
- [ ] **Tareas y recordatorios de seguimiento** — call-backs con fecha y responsable.
- [ ] **Asignación de leads (básica)** — por sucursal/asesor.
- [ ] **Métricas CRM básicas** — pipeline en $, conversión, tiempo de respuesta (o dentro de Reportes).

**Módulo cobrable aparte (costo marginal o valor avanzado opcional):**
- [ ] **Comunicación / WhatsApp** — bandeja unificada de conversaciones + plantillas, ligada al cliente/lead/orden. **Mover WhatsApp de Taller a CRM** (hoy son 3 complementos opt-in de Taller). Cobro por sesión/mensaje como ya se maneja.
  - **UI: dos áreas.** (1) **Conversaciones** — una sola bandeja (lista de chats + panel del chat) con **tabs por tipo/departamento** (Citas · Servicio · Ventas · Hojalatería · Sin asignar · Míos) que son **filtros/colas**, no datos separados: en WhatsApp hay **un hilo por cliente**. El agente etiqueta cada conversación y la manda a su cola; se puede **transferir** entre tabs sin perder historial; los tabs visibles = módulos contratados. (2) **Configuración** — las habilidades del agente por separado (ver bloque del agente abajo).
- [ ] **Campañas y marketing** — difusión segmentada (WhatsApp/correo) a segmentos guardados. Cobrable por el costo de envío.
- [ ] **Retención / posventa automatizada** — recordatorios por km/tiempo, fin de garantía, aniversario, recompra (ya hay piezas en el WhatsApp de Taller). Add-on.
- [ ] **Encuestas / NPS** — ya existe `surveys`; ofrecerlo como módulo y mostrar resultados en la ficha 360.
- [ ] **Asignación avanzada / SLA** (opcional) — round-robin y SLA de primer contacto, como "CRM Pro".

**Agente conversacional (WhatsApp) — arquitectura:**
- [ ] **Runtime: un solo agente orquestador** (un WhatsApp por tenant/línea). Detecta la intención y la manda a la **habilidad** correcta: Citas, Estatus de servicio, Cotización, Ventas, Hojalatería, + escalar a humano. Contexto compartido (cliente, vehículo, orden).
- [ ] **Habilidades activas según los módulos contratados** (un taller mecánico no ve "Ventas"; una agencia sí).
- [ ] **Admin: habilidades SEPARADAS** — cada habilidad con su switch, prompt/mensajes, horarios y escalamiento, y **contratable/cobrable por separado** (como hoy los complementos de WhatsApp del Taller). Unificado para el cliente, separado para configurar y cobrar.
- [ ] Opción de **líneas por departamento** (ventas/servicio con número propio): mismo agente configurado por línea, no bots distintos.
- [ ] **No confundir con el asistente de datos** (staff, OpenRouter, "pregúntale a tus datos") — ese es interno/analítico y va aparte.

Orden sugerido para empezar: (1) Vista 360, (2) WhatsApp/bandeja en CRM, (3) Embudo Kanban, (4) seguimiento/tareas.

## Rebrand a NexQS
- [x] Landing renombrada + logo nuevo + sin referencias a "DMS".
- [ ] **Apps renombradas** (admin/web/pwa/recepción) — textos visibles (en progreso).
- [ ] **Logo definitivo en las apps** cuando esté disponible.

## Seguridad / operativo
- [ ] Endurecer sesión: mover el **refresh token** fuera de localStorage; impersonación deja de usar Bearer local.
- [ ] **Rotar credenciales** expuestas (Postgres/Render/`ENCRYPTION_KEY`/superadmin) + purgar historial de git.
- [ ] Limpiar los tenants **test / test1** en la BD de producción.
