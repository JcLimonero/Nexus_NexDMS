# Pendientes — NexQS

Lista viva de lo que falta, para no perderlo entre sesiones. Marca con `[x]` lo hecho.

> **Alcance:** este roadmap de features es de **NexQS** (la versión independiente de Nexus).
> **Total One** (edición de Total Dealer) = el alcance actual/DMS Lite; lo que el PO de TD pida se
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
- [x] **Plantilla común (`common/pdf/pdf-doc.ts`)** — `PdfDoc`: encabezado con **logo del tenant** (fallback al nombre/razón social), colores de la paleta, secciones, campos, totales, firmas y pie. Fuente única de la identidad.
- [x] **Cotización con PDF** — `quotations/cotizacion-pdf.service.ts` + `GET /quotations/:id/pdf`.
- [x] **Homologados** orden de servicio, corte de caja y listados de export sobre la plantilla/paleta.
- [x] **Varían por sucursal** — encabezado con la **razón social, RFC y domicilio de la sucursal** (cada sucursal puede tener su propia entidad legal). El logo es a nivel tenant.
- [x] **Bug de hoja extra** — el pie ya no genera una segunda hoja vacía.
- [x] **Logo por tenant Y por sucursal** — flujo de subida ya existía (ficha de marca del tenant); agregado el de **sucursal** (diálogo "Editar sucursal": subir / usar el de la empresa). Prioridad en PDF: sucursal → tenant → nombre.
- [x] **Presupuesto de colisión (H&P)** — `bodywork/bodywork-pdf.service.ts` + `GET /bodywork/:id/pdf`.
- [x] **Recibo de pago** — `unit-sales/recibo-pago-pdf.service.ts` + `GET /unit-sales/payments/:paymentId/recibo`.
- [x] **Excel del export** — encabezado con el color de marca del tenant.
- [x] **Entrega por correo** — `common/document-mail/` (servicio global `DocumentoCorreoService`, reusa el proveedor con adjuntos). Endpoints `POST :id/email` en cotización, orden, recibo (`.../recibo/email`) y H&P. Manda el PDF adjunto al correo del cliente (o el que se indique). Falta el botón "Enviar por correo" en el front.
- [x] **Recibo/Ticket de venta** — `sales/recibo-venta-pdf.service.ts` + `GET /sales/:id/recibo?formato=carta|ticket` (carta y ticket 80 mm) + envío por correo.
- [x] **Cobrar OS → generar venta (`Sale`)** — implementado: `POST /service-orders/:id/cobrar` crea un `Sale` con `sale_type = SERVICE_ORDER` ligado a la orden (columna `service_order_id`, migración `1792600000000`), con su `SalePayment` en la caja abierta, sumando a los totales del corte. Idempotente (no cobra dos veces). Botón **"Cobrar"** en el detalle de la OS que abre el recibo. El recibo de venta muestra una línea resumen para ventas de OS.
- [x] **Comprobante de entrega** — `deliveries/comprobante-entrega-pdf.service.ts` + `GET /deliveries/:id/pdf` (+ `POST /deliveries/:id/email`). Acuse que firma el cliente al recibir la unidad o el vehículo del taller: encabezado de marca (logo sucursal→tenant→nombre), checklist de lo entregado con casillas marcadas, observaciones, y **firma incrustada** (imagen de `signature_key`) o línea de firma + "Entregó". Botones **"Comprobante"** y **"Enviar"** en el historial de Actas de entrega.
- [x] **Orden de compra a proveedor** — `purchase-orders/orden-compra-pdf.service.ts` + `GET /purchase-orders/:id/pdf` (+ `POST /purchase-orders/:id/email`). Documento que se manda al proveedor: encabezado del negocio que compra (logo sucursal→tenant→nombre), bloque **Proveedor** (RFC, contacto, condiciones), dónde entregar, partidas (clave·descripción, cant., P.U., importe, garantía por línea si aplica), totales y firmas Autoriza/Recibe. Botones **"Ver PDF"** y **"Enviar al proveedor por correo"** en el detalle de la orden.
- [x] **Carta de garantía** — `warranties/carta-garantia-pdf.service.ts` + `GET /warranties/:id/pdf` (+ `POST /warranties/:id/email`). Certificado que se entrega al cliente: encabezado de marca (logo sucursal→tenant→nombre), cliente, **bien amparado** (unidad/placas/serie), **cobertura** (inicio→vencimiento + vigencia en meses), qué ampara, **resolución** (si ya se atendió), condiciones y firmas. Botones **"Ver carta"** y **"Enviar al cliente"** en el detalle de la garantía.
- [x] **Comprobante de apartado/reservación** — `unit-reservations/comprobante-apartado-pdf.service.ts` + `GET /unit-reservations/:id/pdf` (+ `POST /unit-reservations/:id/email`). Acuse del anticipo: encabezado de marca (logo sucursal→tenant→nombre), cliente, unidad apartada (marca/modelo/serie), **montos** (precio, anticipo recibido, saldo por pagar), notas / motivo de liberación, condiciones y firmas. Botones **"Ver comprobante"** y **"Enviar al cliente"** en el detalle del apartado.
- [x] **Plan de pagos (tabla de amortización)** — `unit-sales/plan-pagos-pdf.service.ts` + `GET /unit-sales/:id/payment-plan/pdf` (+ `POST /unit-sales/:id/payment-plan/email`). Calendario del crédito: encabezado de marca, unidad, **resumen del financiamiento** (precio, enganche, mensualidad, total del plan), **calendario de pagos** (# · vence · monto · estatus · fecha de pago) y totales pagado / saldo. Botones **"Plan de pagos"** y **"Enviar plan"** en el detalle de la venta.
- [x] **Nombre de archivo = código del documento** — todas las descargas usan el **folio/código** del documento como nombre (`TDMGA00000001.pdf`, `TDMAP00000001.pdf`, …), sin prefijos en español, para que el prefijo del código (GA, AP, EN, OC…) indique el tipo y sea fácil de organizar. Homologados entrega/garantía/apartado con el resto (orden, cotización, compra, H&P).
- [ ] **Entrega por WhatsApp** — pendiente (requiere credenciales de WhatsApp Business del tenant y enviar el PDF como documento).
- [ ] **Botones "Enviar/Imprimir" en el front** — en cada documento (hoy el PDF es `inline` y el envío se hace por API).
- [ ] **Consistencia de folios** — usar el código legible en todos (ya se usa el folio propio en orden/cotización/recibo/H&P).
- [x] **Contrato de compraventa** — `unit-sales/contrato-compraventa-pdf.service.ts` + `GET /unit-sales/:id/contrato` (+ envío por correo). Plantilla ilustrativa con **marca de agua**; si el cliente define su texto, usa el suyo (sin marca).
- [x] **Plantilla de contrato editable por el cliente** — tabla genérica `document_templates` (por `template_key`), `GET/PUT /document-templates/:key`, editor de texto reutilizable `app-editor-html` (ControlValueAccessor, salida HTML) y pantalla `/sales/plantilla-contrato`. El contrato renderiza un subconjunto de HTML (párrafos, títulos, listas, negritas/cursiva/subrayado).

### Módulo NexQS futuro — Plantillas de documentos con HTML→PDF y variables
Evolución del punto anterior, empaquetado como **módulo cobrable de NexQS**:
- [ ] **Motor HTML→PDF (Puppeteer/Chromium)** para fidelidad total del formato (el `pdfkit` actual solo interpreta un subconjunto).
- [ ] **Plantilla por defecto por cada documento** (cotización, orden, recibo, contrato, presupuesto…), editable por el cliente si lo desea.
- [ ] **Variables sustituibles** (placeholders tipo `{{cliente.nombre}}`, `{{unidad.serie}}`, `{{precio.total}}`) que se reemplazan con los datos de cada operación; la plantilla base trae las variables ya puestas.
- [ ] **Editor** reutilizable (ya existe `app-editor-html`) + catálogo de variables disponibles por tipo de documento.
- [ ] Empaquetarlo como módulo (activable/cobrable por tenant).

- [ ] **Opcional a futuro** — el subconjunto HTML de `pdfkit` cubre lo básico; el módulo de arriba lo sustituye cuando se priorice.

### Correo saliente con el DOMINIO DEL CLIENTE (por definir)
Hoy el remitente es el dominio de la plataforma. Para que cada correo salga como
`algo@dominio-del-cliente.mx` **no basta con cambiar el `from`**: SPF/DKIM/DMARC exigen
verificar el dominio. Propuesta:
- [ ] **Dominio verificado por tenant en el ESP (Resend).** Al dar de alta un tenant, se crea su "domain" en Resend → devuelve registros DNS (DKIM + Return-Path/SPF). El cliente los agrega a su DNS; al verificar, se envía con su `from` y pasa autenticación.
- [ ] **Guardar en el tenant** el dominio saliente + estado de verificación; al enviar, elegir el `from` del tenant si está verificado, si no, caer al dominio de la plataforma.
- [ ] **UI de onboarding** ("Correo saliente"): el cliente captura su dominio, ve los registros DNS a agregar y un botón "Verificar" (consulta la API de dominios del ESP).
- [ ] **Interino sin DNS del cliente:** enviar desde el dominio de la plataforma pero con **nombre del negocio** en el `from` y **`reply-to` = correo del cliente** (se ve el negocio, aunque no su dominio). Alternativa: subdominio delegado (`mail.sudominio.mx`).

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
