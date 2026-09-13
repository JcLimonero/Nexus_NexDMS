# Pendientes — NexQSystem

Lista viva de lo que falta, para no perderlo entre sesiones. Marca con `[x]` lo hecho.

## Landing (`apps/landing`)
- [ ] **Monitor de citas** — agregar el mock/sección en la landing.
- [ ] **Plataforma de pago configurable** — beneficio en la landing (el cliente elige y configura su pasarela).
- [ ] **Logo definitivo** — reemplazar el placeholder (barra, footer, favicon) cuando llegue de la IA de imágenes.
- [ ] **Desplegar en Vercel** — proyecto nuevo con Root Directory `apps/landing` y dominio `nexusqsystem.com` + `www`.

## Producto (features nuevos)
- [ ] **Pasarela de pago self-service** — el tenant elige su plataforma de pago y la **configura él mismo** desde su panel (hoy solo Conekta). Backend + UI.
- [ ] **Asistente IA sobre sus datos** — agente que responde sobre ventas/taller/inventario del tenant, usando **su propia cuenta de OpenRouter** (bring-your-own-key). Ya anunciado en la landing.
- [ ] **Monitor de citas (producto)** — ya existe `/monitor/citas`; validar/ampliar si hace falta.

## Rebrand a NexQSystem
- [x] Landing renombrada + logo nuevo + sin referencias a "DMS".
- [ ] **Apps renombradas** (admin/web/pwa/recepción) — textos visibles (en progreso).
- [ ] **Logo definitivo en las apps** cuando esté disponible.

## Seguridad / operativo
- [ ] Endurecer sesión: mover el **refresh token** fuera de localStorage; impersonación deja de usar Bearer local.
- [ ] **Rotar credenciales** expuestas (Postgres/Render/`ENCRYPTION_KEY`/superadmin) + purgar historial de git.
- [ ] Limpiar los tenants **test / test1** en la BD de producción.
