# Código: estructura, módulos, APIs, modelos y configuración

## Estructura de carpetas

```
.
├── apps/
│   ├── api/          NestJS (src/{common,config,database,events,modules,queues,shared}, test/)
│   ├── web/          Angular (src/app/{auth,components,features,pages,shared,ui})
│   ├── admin/        Angular (src/app/{core,routes,shared})
│   ├── pwa/          Angular PWA (src/app/{core,pages})
│   ├── recepcion/    Angular (src/app/{core,pages})
│   └── landing/      Sitio estático
├── docs/             Documentación previa (ARCHITECTURE, DATABASE, PLAN_*, modules/) y docs/tecnica/ (esta)
├── nginx/            nginx.dev.conf, nginx.prod.conf
├── scripts/          init.sql, migrate.sh, backup.sh, validate-implementation.sh
├── .cursor/          Reglas y skills para Cursor (convenciones, validación)
├── docker-compose.yml, docker-compose.prod.yml, render.yaml, vercel.json, Makefile
└── *.md (raíz)       Planes, confirmaciones y reportes históricos de implementación
```

Convenciones: ver `docs/CODING_STANDARDS.md` y `.cursor/rules/typeorm-naming.mdc`. Los módulos de `src/modules` siguen la forma `<nombre>/{<nombre>.controller.ts, <nombre>.service.ts, <nombre>.module.ts, entities/, dto/}`.

## Módulos de la API (`apps/api/src/modules`)

- Core/plataforma: `auth`, `admin-auth`, `password-reset`, `users`, `custom-roles`, `role-map`, `tenants`, `provisioning`, `saas`, `modules`, `superadmin-audit`, `audit-log`, `health`, `dashboard`, `cron`.
- Estructura organizacional: `legal-entities`, `branches`, `branch-printers`, `branch-ramps`, `user-availability`.
- CRM: `clients`, `client-types`, `contacts`, `customer-vehicles`, `fleets`, `leads`, `client-portal`, `public-portal`, `whatsapp-bot`, `surveys`, `sale-surveys`.
- Catálogos de vehículo: `global-brands`, `global-models`, `vehicle-types`, `vehicle-categories`, `vehicle-models`, `vehicle-versions`, `vehicle-colors`, `combustion-types`, `master-catalogs`, `catalog-units`, `unit-locations`, `unit-accessories`, `used-units`.
- Ventas de unidades: `unit-reservations`, `unit-sales`, `unit-sale-extras`, `unit-returns`, `unit-return-documents`, `deliveries`, `sales-appointments`, `quotations`, `sale-documents`, `signatures`, `documents`, `document-templates`.
- Refacciones, almacén y compras: `parts`, `part-categories`, `part-returns`, `stock-locations`, `stock-movements`, `stock-counts`, `warehouse-transfers`, `suppliers`, `purchase-orders`, `purchase-requisitions`, `price-lists`.
- Taller: `appointments`, `service-orders`, `service-types`, `service-kits`, `service-phases`, `service-planning`, `mechanic-checklist`, `bodywork`, `vehicle-history`, `warranties`.
- Finanzas: `cash-register`, `sales`, `finance`, `commissions`, `cfdi`, `cfdi-log`, `pld`.
- Utilidades: `export`, `imports`, `notifications`.

## Endpoints

Prefijo global: `/api/v1`. Controladores detectados (`@Controller`), por área:

- Auth: `auth`, `admin-auth`, `admin-users`, `portal/auth`.
- Organización: `tenants`, `legal-entities`, `branches`, `branches/:branchId/ramps`, `branch-printers`, `users`, `custom-roles`, `role-map`, `modules`, `user-availability`.
- Clientes: `clients`, `clients/:clientId/contacts`, `clients/:clientId/documents`, `clients/:clientId/vehicles`, `client-types`, `fleets`, `leads`, `portal`, `client-chat`.
- Catálogos: `global-brands`, `global-models`, `vehicle-types`, `vehicle-categories`, `vehicle-models`, `vehicle-versions`, `vehicle-colors`, `combustion-types`, `master-catalogs`, `catalog-units`, `unit-locations`, `unit-accessories`, `used-units`.
- Ventas: `quotations`, `unit-reservations`, `unit-sales`, `unit-sales/:saleId/extras`, `unit-returns`, `unit-returns/:unitReturnId/documents`, `document-types/unit-return`, `deliveries`, `sales-appointments`, `sale-documents`, `sale-surveys`, `survey-configs`, `signatures`, `documents`, `document-templates`.
- Inventario y compras: `parts`, `part-categories`, `part-returns`, `stock-locations`, `stock-movements`, `stock-counts`, `warehouse-transfers`, `suppliers`, `purchase-orders`, `purchase-requisitions`, `price-lists`.
- Taller: `appointments`, `service-orders`, `service-types`, `service-kits`, `service-phases`, `service-planning`, `mechanic-checklist`, `reception`, `bodywork`, `additional-work`, `vehicle-history`, `warranties`, `operations`.
- Finanzas: `cash-register`, `sales`, `finance`, `commissions`, `mi-cobro`, `cfdi`, `pld`.
- Plataforma y otros: `saas`, `saas/webhook`, `provisioning`, `dashboard`, `notifications`, `export`, `imports`, `storage`, `whatsapp`, `health`, `public`, `public/sale-surveys`, `public/signatures`.

La referencia completa de rutas, DTOs y esquemas es Swagger en `/api/docs` (solo si `NODE_ENV` no es `production`).

Autenticación: JWT (Bearer) o cookie de sesión con CSRF de doble cookie (`common/auth/cookies.ts`); autorización por roles (`RolesGuard`) y alcance (`ScopeGuard`); idempotencia (`IdempotencyGuard`).

## Modelos de datos

Hay 110 archivos `*.entity.ts` y 137 migraciones TypeORM. Tablas por área (nombres de `@Entity`):

- Plataforma: `tenants`, `tenant_status_changes`, `saas_plans`, `saas_module_prices`, `saas_payments`, `admin_users`, `superadmin_audit_log`, `audit_logs`, `notification_logs`, `password_reset_tokens`.
- Organización y usuarios: `legal_entities`, `branches`, `branch_config`, `branch_printers`, `branch_ramps`, `users`, `user_roles`, `user_branches`, `user_schedules`, `user_absences`, `custom_roles`.
- CRM: `clients`, `client_types`, `client_documents`, `contacts`, `customer_vehicles`, `vehicle_ownerships`, `leads`, `lead_activities`, `portal_users`, `portal_messages`, `fleet_agreements`, `fleet_units`.
- Catálogo: `global_brands`, `global_models`, `vehicle_types`, `vehicle_categories`, `vehicle_models`, `vehicle_versions`, `vehicle_colors`, `combustion_types`, `catalog_units`, `unit_locations`, `unit_accessories`, `unit_accessory_compatibilities`, `used_unit_intakes`.
- Ventas de unidades: `unit_reservations`, `unit_sales`, `unit_sale_payments`, `unit_sale_extras`, `unit_sale_accessories`, `unit_returns`, `unit_return_documents`, `deliveries`, `sales_appointments`, `quotations`, `quotation_items`, `quotation_item_photos`, `sale_documents`, `sale_document_types`, `sale_document_rules`, `document_signatures`, `document_templates`, `sale_surveys`, `survey_configs`, `service_surveys`.
- Inventario y compras: `parts`, `part_categories`, `part_equivalences`, `part_suppliers`, `suppliers`, `stock_locations`, `stock_movements`, `stock_counts`, `stock_count_lines`, `warehouse_transfers`, `warehouse_transfer_items`, `purchase_requisitions`, `purchase_orders`, `purchase_order_items`, `part_returns`, `part_return_items`, `price_lists`, `price_list_items` y secuencias de folio (`*_folio_seq`, `sale_ticket_seq`).
- Taller: `appointments`, `service_orders` y sus tablas hijas (`service_order_operations`, `_parts`, `_phases`, `_findings`, `_times`, `_updates`, `_promise_changes`), `service_types`, `service_type_parts`, `service_kits` (+ `_items`, `_phases`), `service_due_notifications`, `mechanic_checklist_items`, `mechanic_safety_checklists`, `reception_checklists`, `reception_photos`, `reception_photo_specs`, `reception_photo_marks`, `bodywork_orders`, `bodywork_items`, `bodywork_parts`, `bodywork_photos`, `warranties`, `warranty_evidence`.
- Finanzas: `cash_sessions`, `cash_movements`, `sales`, `sale_items`, `sale_payments`, `receivables`, `receivable_payments`, `payables`, `payable_payments`, `payment_plans`, `payment_plan_installments`, `commission_periods`, `commission_details`, `cfdi_logs`, `pld_operations`.

Esquema narrativo adicional: `docs/DATABASE.md`.

> Por confirmar: `docs/DATABASE.md` y las tablas actuales pueden diferir (la documentación previa usa nombres en español en algunos lugares; el código usa nombres en inglés). Las migraciones son la fuente de verdad.

## Configuración y variables de entorno

Plantilla: `apps/api/.env.example` (el `.env` real no se versiona). Solo se listan nombres.

| Variable | Propósito |
|----------|-----------|
| `NODE_ENV`, `PORT`, `API_PREFIX` | Entorno, puerto y prefijo |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `REDIS_URL` | Conexión a Redis |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Tokens de sesión |
| `ENCRYPTION_KEY` | Cifrado AES-256 de datos sensibles (por ejemplo credenciales por sucursal) |
| `B2_ENDPOINT`, `B2_BUCKET_NAME`, `B2_BUCKET_BACKUP`, `B2_KEY_ID`, `B2_APP_KEY`, `B2_KEY_PREFIX`, `B2_BUCKET_URL` | Backblaze B2 |
| `RESEND_API_KEY`, `OPS_EMAIL` | Correo y alertas operativas |
| `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` | SMS |
| `CORS_ORIGINS` | Orígenes permitidos (separados por coma) |
| `APP_PUBLIC_URL`, `WEB_APP_URL`, `PWA_APP_URL` | URLs públicas de las apps |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_BOT_BRANCH_SLUG` | WhatsApp Cloud API y bot |
| `CONEKTA_PRIVATE_KEY` | Cobro SaaS |
| `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY` | EmailJS |
| `SAAS_READONLY_DAYS` | Días antes de pasar a solo lectura por mora |
| `NEXUS_ALERT_EMAIL`, `NEXUS_SUPPORT_EMAIL`, `NEXUS_SUPPORT_NAME`, `NEXUS_SUPPORT_PHONE`, `NEXUS_SUPPORT_WHATSAPP` | Datos de soporte y alertas |
| `POSTGRES_PASSWORD`, `REDIS_PASSWORD` | Compose (con valor por defecto de desarrollo en `docker-compose.yml`) |
| `PROXY_API_TARGET` | Destino del proxy de los dev servers Angular |
| `NODE_VERSION` | Versión de Node en Render |

Las credenciales de Facturapi y WhatsApp por sucursal se guardan cifradas en base de datos (según `.env.example`), no en variables de entorno.

> Por confirmar: `.env.example` no lista todas las variables que lee el código (por ejemplo `CORS_ORIGINS`, `CONEKTA_PRIVATE_KEY`, `WHATSAPP_*`, `EMAILJS_*`, `SAAS_READONLY_DAYS`); se obtuvieron buscando `process.env` y `ConfigService` en `src`.
