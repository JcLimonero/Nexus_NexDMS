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
- [ ] **Contabilidad / integración contable** — investigar cómo llevar la contabilidad o, al menos, poder conectarnos o **exportar reportes compatibles con las paqueterías más comunes** (CONTPAQi Contabilidad, ASPEL SAE/COI, etc.): pólizas, catálogo de cuentas y formatos de importación (XML/TXT) que esos sistemas aceptan.

## Rebrand a NexQSystem
- [x] Landing renombrada + logo nuevo + sin referencias a "DMS".
- [ ] **Apps renombradas** (admin/web/pwa/recepción) — textos visibles (en progreso).
- [ ] **Logo definitivo en las apps** cuando esté disponible.

## Seguridad / operativo
- [ ] Endurecer sesión: mover el **refresh token** fuera de localStorage; impersonación deja de usar Bearer local.
- [ ] **Rotar credenciales** expuestas (Postgres/Render/`ENCRYPTION_KEY`/superadmin) + purgar historial de git.
- [ ] Limpiar los tenants **test / test1** en la BD de producción.
