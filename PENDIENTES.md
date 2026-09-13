# Pendientes — NexQSystem

Lista viva de lo que falta, para no perderlo entre sesiones. Marca con `[x]` lo hecho.

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
- [ ] **Campañas y marketing** — difusión segmentada (WhatsApp/correo) a segmentos guardados. Cobrable por el costo de envío.
- [ ] **Retención / posventa automatizada** — recordatorios por km/tiempo, fin de garantía, aniversario, recompra (ya hay piezas en el WhatsApp de Taller). Add-on.
- [ ] **Encuestas / NPS** — ya existe `surveys`; ofrecerlo como módulo y mostrar resultados en la ficha 360.
- [ ] **Asignación avanzada / SLA** (opcional) — round-robin y SLA de primer contacto, como "CRM Pro".

Orden sugerido para empezar: (1) Vista 360, (2) WhatsApp/bandeja en CRM, (3) Embudo Kanban, (4) seguimiento/tareas.

## Rebrand a NexQSystem
- [x] Landing renombrada + logo nuevo + sin referencias a "DMS".
- [ ] **Apps renombradas** (admin/web/pwa/recepción) — textos visibles (en progreso).
- [ ] **Logo definitivo en las apps** cuando esté disponible.

## Seguridad / operativo
- [ ] Endurecer sesión: mover el **refresh token** fuera de localStorage; impersonación deja de usar Bearer local.
- [ ] **Rotar credenciales** expuestas (Postgres/Render/`ENCRYPTION_KEY`/superadmin) + purgar historial de git.
- [ ] Limpiar los tenants **test / test1** en la BD de producción.
