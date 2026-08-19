# Plan de Implementación — Módulo Configuración

## Objetivo
Reemplazar el placeholder de `configuracion` por el módulo de Configuración, siguiendo el flujo Plan-Ejecuta-Valida.

## API existente

### Sucursales (`/api/v1/branches`)
| Recurso | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| Listar | GET | `/api/v1/branches` | page?, limit? |
| Detalle | GET | `/api/v1/branches/:id` | |
| Actualizar | PATCH | `/api/v1/branches/:id` | |
| Config | GET | `/api/v1/branches/:id/config` | Roles: ADMIN |
| Actualizar config | PATCH | `/api/v1/branches/:id/config` | Roles: ADMIN |
| Logo | POST | `/api/v1/branches/:id/logo` | multipart file |

### Branch config (campos)
- whatsappPhoneId, whatsappToken, facturaapiApiKey (sensibles, enmascarados)
- bankName, bankClabe, bankAccount, bankHolder
- cfdiLastFolio

## Estructura del módulo

### Rutas
- `/configuracion` — Landing con accesos
- `/configuracion/sucursales` — Lista sucursales
- `/configuracion/sucursales/:id` — Config de sucursal
- `/configuracion/general` — Placeholder (tenant, etc.)

### Componentes
- [ ] `configuracion-landing/` — Dashboard con cards
- [ ] `sucursales-list/` — Lista sucursales
- [ ] `sucursal-config/` — Formulario config (FacturAPI, WhatsApp, banco)

### Integración
- Reutilizar BranchesService para listado
- Nuevo ConfiguracionService para getConfig, updateConfig

## Validación
- [ ] Build web exitoso
- [ ] Navegación funcional
