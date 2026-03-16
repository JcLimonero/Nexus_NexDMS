# NexDMS — Database Reference

> Fuente de verdad para todas las entidades. Leer antes de crear cualquier entidad o migration.

## Convenciones
- Motor: PostgreSQL 15+ con extensión `uuid-ossp`
- PKs: UUID v4 en todas las tablas
- Toda tabla de dominio: `tenant_id`, `created_at`, `updated_at`, `deleted_at`
- Tablas y columnas: snake_case
- Índices obligatorios: `tenant_id`, todas las FKs, campos de búsqueda frecuente
- NUNCA `synchronize: true` en producción

---

## ORDEN DE MIGRATIONS

```
001_uuid_extension
002_tenants
003_marcas
004_sucursales
005_sucursal_config
006_users
007_modelos_globales
008_listas_precios
009_clientes
010_contactos
011_vehiculos_cliente
012_categorias_parte
013_partes
014_ubicaciones_almacen
015_proveedores
016_ordenes_compra
017_oc_detalle
018_transferencias_almacen
019_transferencia_detalle
020_caja_sesiones
021_ventas
022_ventas_detalle
022b_venta_pagos
023_movimientos_inventario
024_catalogo_unidades
025_ubicaciones_unidades
026_apartados_unidad
027_venta_unidades
028_planes_pago
029_pagos_plan
030_cotizaciones
031_cotizacion_detalle
032_citas
033_ordenes_servicio
034_checklist_recepcion
035_os_partes
036_os_tiempo
037_garantias
038_comisiones_periodo
039_comisiones_detalle
040_cfdi_log
041_notificaciones_log
042_impresoras_sucursal
043_audit_log
044_all_indexes
```

---

## CONFIGURACIÓN

### `impresoras_sucursal`
Mapa de impresoras físicas por sucursal para qz-tray. Sin esto el frontend no sabe a qué impresora enviar cada documento.

| Columna       | Tipo         | Notas                                               |
|---------------|--------------|-----------------------------------------------------|
| id            | UUID PK      |                                                     |
| tenant_id     | UUID FK      | → tenants                                           |
| sucursal_id   | UUID FK      | → sucursales                                        |
| nombre        | VARCHAR(200) | Nombre de la impresora en el sistema operativo      |
| tipo          | ENUM         | `TERMICA_80MM`, `LASER`, `INYECCION`                |
| uso           | ENUM         | `TICKETS`, `DOCUMENTOS`, `AMBOS`                    |
| es_default    | BOOLEAN      | Default false. Una por uso por sucursal             |
| activo        | BOOLEAN      | Default true                                        |
| created_at    | TIMESTAMP    |                                                     |
| updated_at    | TIMESTAMP    |                                                     |

**Regla:** Solo una impresora `es_default = true` por combinación `(sucursal_id, uso)`.
**Uso en frontend:** Al generar un ticket → buscar impresora default de uso `TICKETS` o `AMBOS` de la sucursal del usuario → enviar a qz-tray. Si no hay impresora configurada → ofrecer descarga de PDF en su lugar.

**Índices:** `tenant_id`, `sucursal_id`

---

## CORE

### `tenants`
| Columna    | Tipo         | Notas                        |
|------------|--------------|------------------------------|
| id         | UUID PK      |                              |
| nombre     | VARCHAR(200) | Nombre del grupo empresarial |
| slug       | VARCHAR(100) | UNIQUE                       |
| plan       | ENUM         | `BASIC`,`PRO`,`ENTERPRISE`   |
| activo     | BOOLEAN      | Default true                 |
| created_at | TIMESTAMP    |                              |
| updated_at | TIMESTAMP    |                              |

---

### `marcas`
| Columna    | Tipo         | Notas                          |
|------------|--------------|--------------------------------|
| id         | UUID PK      |                                |
| tenant_id  | UUID FK      | → tenants                      |
| nombre     | VARCHAR(100) | "Honda", "KIA", "Geely"        |
| tipo       | ENUM         | `MOTO`, `AUTO`, `AMBOS`        |
| logo_key   | VARCHAR(500) | Nullable. Key en B2            |
| activo     | BOOLEAN      | Default true                   |
| created_at | TIMESTAMP    |                                |
| updated_at | TIMESTAMP    |                                |

**Índices:** `tenant_id`

---

### `sucursales`
| Columna              | Tipo         | Notas                                           |
|----------------------|--------------|-------------------------------------------------|
| id                   | UUID PK      |                                                 |
| tenant_id            | UUID FK      | → tenants                                       |
| marca_id             | UUID FK      | → marcas                                        |
| nombre               | VARCHAR(200) | Nombre comercial                                |
| slug                 | VARCHAR(100) | UNIQUE por tenant. Para URL pública de citas    |
| rfc                  | VARCHAR(13)  | RFC propio — emisor en FacturAPI                |
| razon_social         | VARCHAR(300) |                                                 |
| regimen_fiscal       | VARCHAR(10)  | Clave SAT                                       |
| cp_fiscal            | VARCHAR(10)  |                                                 |
| direccion            | VARCHAR(500) |                                                 |
| ciudad               | VARCHAR(100) |                                                 |
| estado               | VARCHAR(100) |                                                 |
| telefono_mostrador   | VARCHAR(20)  |                                                 |
| telefono_refacciones | VARCHAR(20)  | Nullable                                        |
| telefono_citas       | VARCHAR(20)  | Nullable                                        |
| telefono_postventa   | VARCHAR(20)  | Nullable                                        |
| email                | VARCHAR(200) |                                                 |
| horario              | JSONB        | `{"lun":"9:00-18:00","sab":"9:00-14:00",...}`  |
| logo_key             | VARCHAR(500) | Nullable. Key en B2                             |
| facturaapi_org_id    | VARCHAR(200) | Nullable. ID organización FacturAPI             |
| es_principal         | BOOLEAN      | Default false                                   |
| activo               | BOOLEAN      | Default true                                    |
| created_at           | TIMESTAMP    |                                                 |
| updated_at           | TIMESTAMP    |                                                 |

**Índices:** `tenant_id`, `marca_id`, `slug` (unique)

---

### `sucursal_config`
Credenciales sensibles cifradas con AES-256.

| Columna            | Tipo         | Notas                                    |
|--------------------|--------------|------------------------------------------|
| id                 | UUID PK      |                                          |
| sucursal_id        | UUID FK      | → sucursales. UNIQUE                     |
| whatsapp_phone_id  | TEXT         | Cifrado. Phone ID Meta Cloud API         |
| whatsapp_token     | TEXT         | Cifrado. Token permanente Meta           |
| facturaapi_api_key | TEXT         | Cifrado. API Key de FacturAPI            |
| banco_nombre       | VARCHAR(100) | Nullable                                 |
| banco_clabe        | VARCHAR(18)  | Nullable                                 |
| banco_cuenta       | VARCHAR(20)  | Nullable                                 |
| banco_titular      | VARCHAR(300) | Nullable                                 |
| updated_at         | TIMESTAMP    |                                          |

---

### `users`

| Columna             | Tipo         | Notas                                                           |
|---------------------|--------------|-----------------------------------------------------------------|
| id                  | UUID PK      |                                                                 |
| tenant_id           | UUID FK      | → tenants                                                       |
| sucursal_id         | UUID FK      | → sucursales. Sucursal principal del usuario                    |
| marca_id            | UUID FK      | → marcas. Nullable. Solo GERENTE con scope MARCA                |
| nombre              | VARCHAR(200) |                                                                 |
| apellido            | VARCHAR(200) |                                                                 |
| email               | VARCHAR(300) | UNIQUE por tenant                                               |
| password_hash       | VARCHAR(500) | bcrypt factor 12                                                |
| rol                 | ENUM         | `ADMIN`,`GERENTE`,`ALMACEN`,`MOSTRADOR`,`MECANICO`,`VENDEDOR`  |
| scope               | ENUM         | `GLOBAL`,`MARCA`,`SUCURSAL`                                     |
| password_changed_at | TIMESTAMP    | Para validar expiración de 90 días en cada login                |
| login_attempts      | INTEGER      | Default 0. Bloqueo al llegar a 5                                |
| blocked_until       | TIMESTAMP    | Nullable. Hasta cuándo está bloqueado                           |
| totp_enabled        | BOOLEAN      | Default false                                                   |
| totp_secret         | TEXT         | Nullable. **Cifrado AES-256** igual que `sucursal_config`. Nunca texto plano. |
| totp_verified_at    | TIMESTAMP    | Nullable. Cuándo activó 2FA por primera vez                     |
| telefono            | VARCHAR(20)  | Nullable                                                        |
| avatar_key          | VARCHAR(500) | Nullable                                                        |
| activo              | BOOLEAN      | Default true                                                    |
| ultimo_login        | TIMESTAMP    | Nullable                                                        |
| created_at          | TIMESTAMP    |                                                                 |
| updated_at          | TIMESTAMP    |                                                                 |
| deleted_at          | TIMESTAMP    | Soft delete                                                     |

**Regla 2FA:** ADMIN y GERENTE tienen `totp_enabled = true` obligatorio. El sistema fuerza la activación en el primer login si aún no está configurado. Para otros roles es opcional.

**Regla expiración:** En cada login verificar `password_changed_at`. Si han pasado >90 días, redirigir a cambio de contraseña obligatorio antes de acceder al sistema.

**Regla bloqueo:** Al llegar `login_attempts = 5`, setear `blocked_until = now() + 30 min`. Solo un usuario de rol superior dentro del scope puede desbloquearlo manualmente (reset a 0).

**Índices:** `tenant_id`, `(tenant_id, email)` unique, `sucursal_id`, `marca_id`

---

## CATÁLOGO GLOBAL

### `modelos_globales`
Catálogo maestro mantenido por Nexus Q Tech. Los tenants no pueden modificarlo.

| Columna        | Tipo         | Notas                          |
|----------------|--------------|--------------------------------|
| id             | UUID PK      |                                |
| marca_nombre   | VARCHAR(100) | "Honda", "KIA"                 |
| tipo_vehiculo  | ENUM         | `MOTO`, `AUTO`                 |
| modelo         | VARCHAR(200) | "CB 150", "Sportage"           |
| anio_inicio    | INTEGER      | Año de inicio de producción    |
| anio_fin       | INTEGER      | Nullable. Año de fin           |
| cilindraje     | INTEGER      | Nullable. Solo motos (cc)      |
| num_puertas    | INTEGER      | Nullable. Solo autos           |
| activo         | BOOLEAN      | Default true                   |
| created_at     | TIMESTAMP    |                                |

**Índices:** `marca_nombre`, `tipo_vehiculo`

---

## CRM

### `clientes`
| Columna        | Tipo         | Notas                                        |
|----------------|--------------|----------------------------------------------|
| id             | UUID PK      |                                              |
| tenant_id      | UUID FK      | → tenants                                    |
| tipo_cliente   | ENUM         | `PUBLICO`,`MAYOREO`,`EMPRESA`                |
| es_empresa     | BOOLEAN      | Default false                                |
| nombre         | VARCHAR(200) | Nombre o razón social                        |
| apellido       | VARCHAR(200) | Nullable si es empresa                       |
| razon_social   | VARCHAR(300) | Nullable si es persona física                |
| rfc            | VARCHAR(13)  | Nullable. Requerido para CFDI                |
| curp           | VARCHAR(18)  | Nullable                                     |
| regimen_fiscal | VARCHAR(10)  | Nullable. Clave SAT                          |
| cp_fiscal      | VARCHAR(10)  | Nullable. Requerido para CFDI                |
| telefono       | VARCHAR(20)  |                                              |
| telefono_alt   | VARCHAR(20)  | Nullable                                     |
| email          | VARCHAR(300) | Nullable                                     |
| direccion      | VARCHAR(500) | Nullable                                     |
| ciudad         | VARCHAR(100) | Nullable                                     |
| estado         | VARCHAR(100) | Nullable                                     |
| descuento_fijo | DECIMAL(5,2) | Default 0. % de descuento para tipo EMPRESA  |
| notas          | TEXT         | Nullable                                     |
| created_at     | TIMESTAMP    |                                              |
| updated_at     | TIMESTAMP    |                                              |
| deleted_at     | TIMESTAMP    |                                              |

**Índices:** `tenant_id`, `telefono`, `rfc`, `tipo_cliente`

---

### `contactos`
Personas físicas asociadas a un cliente (empleados de empresa, familiares, operadores).

| Columna        | Tipo         | Notas                                          |
|----------------|--------------|------------------------------------------------|
| id             | UUID PK      |                                                |
| tenant_id      | UUID FK      | → tenants                                      |
| cliente_id     | UUID FK      | → clientes                                     |
| nombre         | VARCHAR(200) |                                                |
| apellido       | VARCHAR(200) | Nullable                                       |
| telefono       | VARCHAR(20)  |                                                |
| email          | VARCHAR(300) | Nullable                                       |
| puesto         | VARCHAR(200) | Nullable. "Operador de flota", "Gerente"       |
| departamento   | VARCHAR(200) | Nullable                                       |
| es_autorizado  | BOOLEAN      | Default true. Puede autorizar trabajos         |
| notas          | TEXT         | Nullable                                       |
| activo         | BOOLEAN      | Default true                                   |
| created_at     | TIMESTAMP    |                                                |
| updated_at     | TIMESTAMP    |                                                |

**Índices:** `tenant_id`, `cliente_id`, `telefono`

---

### `vehiculos_cliente`
| Columna               | Tipo         | Notas                                             |
|-----------------------|--------------|---------------------------------------------------|
| id                    | UUID PK      |                                                   |
| tenant_id             | UUID FK      | → tenants                                         |
| propietario_id        | UUID FK      | → clientes. Dueño del vehículo                    |
| modelo_global_id      | UUID FK      | → modelos_globales. Nullable                      |
| tipo_vehiculo         | ENUM         | `MOTO`,`AUTO`                                     |
| marca                 | VARCHAR(100) |                                                   |
| modelo                | VARCHAR(200) |                                                   |
| anio                  | INTEGER      |                                                   |
| color                 | VARCHAR(100) | Nullable                                          |
| placa                 | VARCHAR(20)  | Nullable                                          |
| numero_serie          | VARCHAR(100) | Nullable. Requerido para garantías                |
| numero_motor          | VARCHAR(100) | Nullable                                          |
| km_actual             | INTEGER      | Default 0                                         |
| contacto_asignado_id  | UUID FK      | → contactos. Nullable. Operador habitual          |
| notas                 | TEXT         | Nullable                                          |
| created_at            | TIMESTAMP    |                                                   |
| updated_at            | TIMESTAMP    |                                                   |
| deleted_at            | TIMESTAMP    |                                                   |

**Índices:** `tenant_id`, `propietario_id`, `numero_serie`, `placa`

---

## INVENTARIO

### `ubicaciones_almacen`
Coordenadas físicas configurables por sucursal.

| Columna      | Tipo         | Notas                                        |
|--------------|--------------|----------------------------------------------|
| id           | UUID PK      |                                              |
| tenant_id    | UUID FK      | → tenants                                    |
| sucursal_id  | UUID FK      | → sucursales                                 |
| codigo       | VARCHAR(20)  | UNIQUE por sucursal. Ej: "B-2-14-C"         |
| zona         | VARCHAR(10)  | Ej: "A","B","C"                              |
| pasillo      | VARCHAR(10)  | Nullable                                     |
| estante      | VARCHAR(10)  | Nullable                                     |
| nivel        | VARCHAR(10)  | Nullable. "A" (inferior) a "E" (superior)   |
| descripcion  | VARCHAR(200) | Nullable                                     |
| activo       | BOOLEAN      | Default true                                 |
| created_at   | TIMESTAMP    |                                              |

**Índices:** `tenant_id`, `sucursal_id`, `(sucursal_id, codigo)` unique

---

### `categorias_parte`
| Columna     | Tipo         | Notas     |
|-------------|--------------|-----------|
| id          | UUID PK      |           |
| tenant_id   | UUID FK      | → tenants |
| nombre      | VARCHAR(200) |           |
| descripcion | TEXT         | Nullable  |
| activo      | BOOLEAN      |           |
| created_at  | TIMESTAMP    |           |
| updated_at  | TIMESTAMP    |           |

---

### `partes`
| Columna             | Tipo           | Notas                                        |
|---------------------|----------------|----------------------------------------------|
| id                  | UUID PK        |                                              |
| tenant_id           | UUID FK        | → tenants                                    |
| sucursal_id         | UUID FK        | → sucursales. Stock es por sucursal          |
| categoria_id        | UUID FK        | → categorias_parte                           |
| ubicacion_id        | UUID FK        | → ubicaciones_almacen. Nullable              |
| codigo_sku          | VARCHAR(100)   | UNIQUE por sucursal                          |
| codigo_barras       | VARCHAR(100)   | Nullable                                     |
| nombre              | VARCHAR(300)   |                                              |
| descripcion         | TEXT           | Nullable                                     |
| tipo_vehiculo       | ENUM           | `MOTO`,`AUTO`,`AMBOS`                        |
| marca_compatible    | VARCHAR(200)   | Nullable. "Honda,Yamaha"                     |
| unidad_medida       | VARCHAR(50)    | Default `PIEZA`                              |
| precio_compra       | DECIMAL(12,2)  |                                              |
| precio_publico      | DECIMAL(12,2)  | Lista PUBLICO                                |
| precio_mayoreo      | DECIMAL(12,2)  | Lista MAYOREO                                |
| precio_empresa      | DECIMAL(12,2)  | Lista EMPRESA                                |
| descuento_max_pct   | DECIMAL(5,2)   | Default 10. % máximo sin aprobación gerente  |
| stock_actual        | INTEGER        | Default 0. Nunca negativo.                   |
| stock_minimo        | INTEGER        | Default 1                                    |
| stock_maximo        | INTEGER        | Nullable                                     |
| imagen_key          | VARCHAR(500)   | Nullable                                     |
| activo              | BOOLEAN        | Default true                                 |
| created_at          | TIMESTAMP      |                                              |
| updated_at          | TIMESTAMP      |                                              |
| deleted_at          | TIMESTAMP      |                                              |

**Índices:** `tenant_id`, `sucursal_id`, `codigo_sku`, `codigo_barras`, `tipo_vehiculo`, `ubicacion_id`

---

### `movimientos_inventario`
| Columna          | Tipo         | Notas                                                        |
|------------------|--------------|--------------------------------------------------------------|
| id               | UUID PK      |                                                              |
| tenant_id        | UUID FK      |                                                              |
| parte_id         | UUID FK      | → partes                                                     |
| sucursal_id      | UUID FK      | → sucursales                                                 |
| usuario_id       | UUID FK      | → users                                                      |
| tipo_movimiento  | ENUM         | `ENTRADA_OC`,`ENTRADA_AJUSTE`,`SALIDA_VENTA`,`SALIDA_OS`,`SALIDA_AJUSTE`,`TRANSFERENCIA_OUT`,`TRANSFERENCIA_IN` |
| cantidad         | INTEGER      | Siempre positivo. El tipo indica dirección.                  |
| stock_antes      | INTEGER      |                                                              |
| stock_despues    | INTEGER      |                                                              |
| referencia_id    | UUID         | Nullable. ID del OC, Venta u OS                              |
| referencia_tipo  | VARCHAR(50)  | Nullable. `ORDEN_COMPRA`,`VENTA`,`ORDEN_SERVICIO`           |
| notas            | TEXT         | Nullable                                                     |
| created_at       | TIMESTAMP    |                                                              |

**Índices:** `tenant_id`, `parte_id`, `sucursal_id`, `created_at`

---

## COMPRAS

### `proveedores`
| Columna           | Tipo         | Notas               |
|-------------------|--------------|---------------------|
| id                | UUID PK      |                     |
| tenant_id         | UUID FK      |                     |
| nombre            | VARCHAR(300) |                     |
| contacto          | VARCHAR(200) | Nullable            |
| telefono          | VARCHAR(20)  | Nullable            |
| email             | VARCHAR(300) | Nullable            |
| rfc               | VARCHAR(13)  | Nullable            |
| condiciones_pago  | VARCHAR(200) | Nullable            |
| dias_credito      | INTEGER      | Default 0           |
| activo            | BOOLEAN      | Default true        |
| created_at        | TIMESTAMP    |                     |
| updated_at        | TIMESTAMP    |                     |
| deleted_at        | TIMESTAMP    |                     |

---

### `ordenes_compra`
| Columna          | Tipo          | Notas                                         |
|------------------|---------------|-----------------------------------------------|
| id               | UUID PK       |                                               |
| tenant_id        | UUID FK       |                                               |
| sucursal_id      | UUID FK       | → sucursales                                  |
| proveedor_id     | UUID FK       | → proveedores                                 |
| usuario_id       | UUID FK       | → users                                       |
| folio            | VARCHAR(50)   | `OC-{YYYY}-{0001}` por tenant                |
| estatus          | ENUM          | `BORRADOR`,`ENVIADA`,`PARCIAL`,`RECIBIDA`,`CANCELADA` |
| subtotal         | DECIMAL(12,2) |                                               |
| impuestos        | DECIMAL(12,2) |                                               |
| total            | DECIMAL(12,2) |                                               |
| cfdi_proveedor   | VARCHAR(100)  | Nullable. UUID SAT de la factura del proveedor|
| fecha_pedido     | DATE          |                                               |
| fecha_esperada   | DATE          | Nullable                                      |
| fecha_recepcion  | DATE          | Nullable                                      |
| notas            | TEXT          | Nullable                                      |
| created_at       | TIMESTAMP     |                                               |
| updated_at       | TIMESTAMP     |                                               |

---

### `oc_detalle`
| Columna           | Tipo          | Notas                    |
|-------------------|---------------|--------------------------|
| id                | UUID PK       |                          |
| orden_compra_id   | UUID FK       | → ordenes_compra         |
| parte_id          | UUID FK       | → partes                 |
| cantidad          | INTEGER       |                          |
| cantidad_recibida | INTEGER       | Default 0                |
| precio_unitario   | DECIMAL(12,2) |                          |
| subtotal          | DECIMAL(12,2) |                          |

---

## ALMACÉN

### `transferencias_almacen`
| Columna              | Tipo         | Notas                                        |
|----------------------|--------------|----------------------------------------------|
| id                   | UUID PK      |                                              |
| tenant_id            | UUID FK      |                                              |
| sucursal_origen_id   | UUID FK      | → sucursales                                 |
| sucursal_destino_id  | UUID FK      | → sucursales                                 |
| aprobador_id         | UUID FK      | → users. Quien aprobó                        |
| folio                | VARCHAR(50)  | `TRF-{YYYY}-{0001}`                         |
| tipo                 | ENUM         | `INTRA_MARCA`,`INTER_MARCA`                  |
| estatus              | ENUM         | `PENDIENTE`,`APROBADA`,`EN_TRANSITO`,`RECIBIDA`,`CANCELADA` |
| notas                | TEXT         | Nullable                                     |
| created_at           | TIMESTAMP    |                                              |
| updated_at           | TIMESTAMP    |                                              |

**Regla:** `INTRA_MARCA` requiere aprobación de `GERENTE_MARCA`. `INTER_MARCA` requiere `GERENTE_GLOBAL`.

### `transferencia_detalle`
| Columna          | Tipo     | Notas                    |
|------------------|----------|--------------------------|
| id               | UUID PK  |                          |
| transferencia_id | UUID FK  | → transferencias_almacen |
| parte_id         | UUID FK  | → partes                 |
| cantidad         | INTEGER  |                          |

---

## CAJA Y VENTAS

### `caja_sesiones`
| Columna             | Tipo          | Notas                                     |
|---------------------|---------------|-------------------------------------------|
| id                  | UUID PK       |                                           |
| tenant_id           | UUID FK       |                                           |
| sucursal_id         | UUID FK       | Solo una ABIERTA por sucursal a la vez    |
| usuario_id          | UUID FK       | → users. Cajero                           |
| fondo_inicial       | DECIMAL(12,2) |                                           |
| fondo_final         | DECIMAL(12,2) | Nullable. Contado al cerrar               |
| total_efectivo      | DECIMAL(12,2) | Default 0. Se acumula con cada venta      |
| total_tarjeta       | DECIMAL(12,2) | Default 0                                 |
| total_transferencia | DECIMAL(12,2) | Default 0                                 |
| total_ventas        | DECIMAL(12,2) | Default 0                                 |
| diferencia          | DECIMAL(12,2) | Nullable. fondo_final - esperado          |
| apertura            | TIMESTAMP     |                                           |
| cierre              | TIMESTAMP     | Nullable                                  |
| estatus             | ENUM          | `ABIERTA`,`CERRADA`                       |
| notas_cierre        | TEXT          | Nullable                                  |

---

### `ventas`
| Columna          | Tipo          | Notas                                          |
|------------------|---------------|------------------------------------------------|
| id               | UUID PK       |                                                |
| tenant_id        | UUID FK       |                                                |
| sucursal_id      | UUID FK       |                                                |
| caja_sesion_id   | UUID FK       | → caja_sesiones. Nullable                      |
| cliente_id       | UUID FK       | → clientes. Nullable (público general)         |
| usuario_id       | UUID FK       | → users. Vendedor                              |
| tipo_venta       | ENUM          | `MOSTRADOR`,`ORDEN_SERVICIO`                   |
| estatus          | ENUM          | `ABIERTA`,`PAGADA`,`CANCELADA`                 |
| metodo_pago      | ENUM          | `EFECTIVO`,`TARJETA`,`TRANSFERENCIA`,`MIXTO`   |
| lista_precios    | ENUM          | `PUBLICO`,`MAYOREO`,`EMPRESA`                  |
| subtotal         | DECIMAL(12,2) |                                                |
| descuento        | DECIMAL(12,2) | Default 0                                      |
| impuestos        | DECIMAL(12,2) |                                                |
| total            | DECIMAL(12,2) |                                                |
| numero_ticket    | VARCHAR(50)   | `TK-{YYYY}-{0001}`                            |
| cfdi_uuid        | VARCHAR(100)  | Nullable                                       |
| created_at       | TIMESTAMP     |                                                |
| updated_at       | TIMESTAMP     |                                                |

---

### `ventas_detalle`
| Columna          | Tipo          | Notas                             |
|------------------|---------------|-----------------------------------|
| id               | UUID PK       |                                   |
| venta_id         | UUID FK       | → ventas                          |
| parte_id         | UUID FK       | → partes                          |
| cantidad         | INTEGER       |                                   |
| precio_unitario  | DECIMAL(12,2) | Precio al momento de venta        |
| descuento        | DECIMAL(12,2) | Default 0                         |
| subtotal         | DECIMAL(12,2) |                                   |

---

### `venta_pagos`
Detalle de métodos de pago por venta. Requerido para cuadre de caja por método.
Una venta puede tener múltiples registros si el pago es MIXTO.

| Columna     | Tipo          | Notas                                         |
|-------------|---------------|-----------------------------------------------|
| id          | UUID PK       |                                               |
| venta_id    | UUID FK       | → ventas                                      |
| metodo      | ENUM          | `EFECTIVO`,`TARJETA`,`TRANSFERENCIA`          |
| monto       | DECIMAL(12,2) | Monto pagado con este método                  |
| referencia  | VARCHAR(200)  | Nullable. Últimos 4 dígitos de tarjeta, folio transferencia, etc. |
| created_at  | TIMESTAMP     |                                               |

**Regla:** `SUM(venta_pagos.monto) = ventas.total` siempre.
**Regla:** `ventas.metodo_pago` se deriva: si hay 1 registro → su método. Si hay >1 → `MIXTO`.
**Impacto en caja:** `caja_sesiones.total_efectivo/tarjeta/transferencia` se calculan sumando `venta_pagos` de la sesión, no el campo ENUM de `ventas`.

**Índices:** `venta_id`

---

## UNIDADES

### `catalogo_unidades`
| Columna              | Tipo          | Notas                                      |
|----------------------|---------------|--------------------------------------------|
| id                   | UUID PK       |                                            |
| tenant_id            | UUID FK       |                                            |
| sucursal_id          | UUID FK       | → sucursales                               |
| modelo_global_id     | UUID FK       | → modelos_globales. Nullable               |
| tipo_vehiculo        | ENUM          | `MOTO`,`AUTO`                              |
| marca                | VARCHAR(100)  |                                            |
| modelo               | VARCHAR(200)  |                                            |
| anio                 | INTEGER       |                                            |
| version              | VARCHAR(200)  | Nullable                                   |
| color                | VARCHAR(100)  |                                            |
| numero_serie         | VARCHAR(100)  | UNIQUE                                     |
| numero_motor         | VARCHAR(100)  | Nullable                                   |
| cilindraje           | INTEGER       | Nullable. Motos (cc)                       |
| num_puertas          | INTEGER       | Nullable. Autos                            |
| precio_costo         | DECIMAL(12,2) |                                            |
| precio_lista         | DECIMAL(12,2) |                                            |
| precio_venta         | DECIMAL(12,2) | Base de negociación                        |
| estatus              | ENUM          | `DISPONIBLE`,`APARTADO`,`VENDIDO`,`BAJA`  |
| imagen_key           | VARCHAR(500)  | Nullable                                   |
| imagenes_keys        | TEXT[]        | Nullable. Fotos adicionales               |
| notas                | TEXT          | Nullable                                   |
| fecha_adquisicion    | DATE          | Nullable                                   |
| created_at           | TIMESTAMP     |                                            |
| updated_at           | TIMESTAMP     |                                            |
| deleted_at           | TIMESTAMP     |                                            |

**Índices:** `tenant_id`, `sucursal_id`, `numero_serie`, `estatus`, `tipo_vehiculo`

---

### `ubicaciones_unidad`
Espacios físicos en lote/exhibición/bodega por sucursal.

| Columna      | Tipo         | Notas                                  |
|--------------|--------------|----------------------------------------|
| id           | UUID PK      |                                        |
| tenant_id    | UUID FK      |                                        |
| sucursal_id  | UUID FK      | → sucursales                           |
| codigo       | VARCHAR(20)  | UNIQUE por sucursal. "LOTE-A-05"      |
| zona         | ENUM         | `LOTE`,`EXHIBICION`,`BODEGA`           |
| espacio      | VARCHAR(20)  | Número o nombre del espacio            |
| descripcion  | VARCHAR(200) | Nullable                               |
| activo       | BOOLEAN      | Default true                           |
| created_at   | TIMESTAMP    |                                        |

**Regla:** Al asignar ubicación a una unidad, actualizar `catalogo_unidades.ubicacion_id`. Una ubicación solo puede tener una unidad a la vez.

---

### `apartados_unidad`
| Columna            | Tipo          | Notas                                         |
|--------------------|---------------|-----------------------------------------------|
| id                 | UUID PK       |                                               |
| tenant_id          | UUID FK       |                                               |
| catalogo_unidad_id | UUID FK       | → catalogo_unidades                           |
| cliente_id         | UUID FK       | → clientes                                    |
| usuario_id         | UUID FK       | → users. Quien tomó el apartado               |
| monto_anticipo     | DECIMAL(12,2) | Monto cobrado como anticipo                   |
| estatus            | ENUM          | `ACTIVO`,`CONVERTIDO`,`LIBERADO`              |
| notas              | TEXT          | Nullable                                      |
| liberado_por_id    | UUID FK       | → users. Nullable. Quien liberó              |
| motivo_liberacion  | TEXT          | Nullable                                      |
| created_at         | TIMESTAMP     |                                               |
| updated_at         | TIMESTAMP     |                                               |

**Regla:** Solo puede haber un apartado `ACTIVO` por unidad. Al apartar, unidad pasa a `APARTADO`. Sin expiración automática — solo GERENTE_SUCURSAL puede liberar.

---

### `venta_unidades`
| Columna              | Tipo          | Notas                                         |
|----------------------|---------------|-----------------------------------------------|
| id                   | UUID PK       |                                               |
| tenant_id            | UUID FK       |                                               |
| catalogo_unidad_id   | UUID FK       | → catalogo_unidades                           |
| cliente_id           | UUID FK       | → clientes                                    |
| usuario_id           | UUID FK       | → users. Vendedor                             |
| cotizacion_id        | UUID FK       | → cotizaciones. Nullable                      |
| apartado_id          | UUID FK       | → apartados_unidad. Nullable                  |
| folio                | VARCHAR(50)   | `VU-{YYYY}-{0001}`                           |
| precio_lista         | DECIMAL(12,2) |                                               |
| precio_final         | DECIMAL(12,2) |                                               |
| anticipo_aplicado    | DECIMAL(12,2) | Default 0. Del apartado si existía            |
| enganche             | DECIMAL(12,2) | Default 0                                     |
| tipo_financiamiento  | ENUM          | `CONTADO`,`CREDITO_AGENCIA`,`CREDITO_BANCO`  |
| banco_financiador    | VARCHAR(200)  | Nullable. Si CREDITO_BANCO                    |
| folio_banco          | VARCHAR(100)  | Nullable. Número de crédito bancario          |
| estatus              | ENUM          | `PROCESO`,`COMPLETADA`,`CANCELADA`            |
| cfdi_uuid            | VARCHAR(100)  | Nullable                                      |
| fecha_entrega        | DATE          | Nullable                                      |
| notas                | TEXT          | Nullable                                      |
| created_at           | TIMESTAMP     |                                               |
| updated_at           | TIMESTAMP     |                                               |

---

### `planes_pago`
Solo para `tipo_financiamiento = CREDITO_AGENCIA`.

| Columna           | Tipo          | Notas                    |
|-------------------|---------------|--------------------------|
| id                | UUID PK       |                          |
| venta_unidad_id   | UUID FK       | → venta_unidades         |
| numero_pagos      | INTEGER       |                          |
| monto_mensual     | DECIMAL(12,2) |                          |
| tasa_interes      | DECIMAL(5,2)  | % anual                  |
| monto_total       | DECIMAL(12,2) | Total con intereses       |
| fecha_primer_pago | DATE          |                          |
| estatus           | ENUM          | `ACTIVO`,`LIQUIDADO`,`VENCIDO` |
| created_at        | TIMESTAMP     |                          |
| updated_at        | TIMESTAMP     |                          |

---

### `pagos_plan`
| Columna            | Tipo          | Notas                                  |
|--------------------|---------------|----------------------------------------|
| id                 | UUID PK       |                                        |
| plan_pago_id       | UUID FK       | → planes_pago                          |
| numero_parcialidad | INTEGER       |                                        |
| monto              | DECIMAL(12,2) |                                        |
| fecha_vencimiento  | DATE          |                                        |
| fecha_pago         | DATE          | Nullable                               |
| estatus            | ENUM          | `PENDIENTE`,`PAGADO`,`VENCIDO`         |
| metodo_pago        | ENUM          | Nullable                               |
| cfdi_uuid          | VARCHAR(100)  | Nullable. Complemento de pago          |
| created_at         | TIMESTAMP     |                                        |
| updated_at         | TIMESTAMP     |                                        |

**Índices:** `plan_pago_id`, `fecha_vencimiento`, `estatus`

---

## COTIZACIONES

### `cotizaciones`
| Columna          | Tipo          | Notas                                            |
|------------------|---------------|--------------------------------------------------|
| id               | UUID PK       |                                                  |
| tenant_id        | UUID FK       |                                                  |
| sucursal_id      | UUID FK       |                                                  |
| cliente_id       | UUID FK       | → clientes. Nullable                             |
| usuario_id       | UUID FK       | → users                                          |
| aprobador_id     | UUID FK       | → users. Nullable. Si requirió aprobación        |
| tipo             | ENUM          | `REFACCIONES`,`SERVICIO`,`UNIDAD`                |
| folio            | VARCHAR(50)   | `COT-{YYYY}-{0001}`                             |
| estatus          | ENUM          | `BORRADOR`,`PENDIENTE_APROBACION`,`APROBADA`,`ENVIADA`,`ACEPTADA`,`RECHAZADA`,`VENCIDA`,`CONVERTIDA` |
| lista_precios    | ENUM          | `PUBLICO`,`MAYOREO`,`EMPRESA`                    |
| subtotal         | DECIMAL(12,2) |                                                  |
| descuento_pct    | DECIMAL(5,2)  | Default 0                                        |
| descuento_monto  | DECIMAL(12,2) | Default 0                                        |
| impuestos        | DECIMAL(12,2) |                                                  |
| total            | DECIMAL(12,2) |                                                  |
| condiciones      | TEXT          | Nullable                                         |
| fecha_vigencia   | DATE          | Configurable por sucursal                        |
| pdf_key          | VARCHAR(500)  | Nullable                                         |
| created_at       | TIMESTAMP     |                                                  |
| updated_at       | TIMESTAMP     |                                                  |

**Regla:** Si `descuento_pct > sucursal.descuento_max_pct`, estatus pasa a `PENDIENTE_APROBACION` y se notifica al GERENTE_SUCURSAL.

---

### `cotizacion_detalle`
| Columna              | Tipo          | Notas                     |
|----------------------|---------------|---------------------------|
| id                   | UUID PK       |                           |
| cotizacion_id        | UUID FK       | → cotizaciones            |
| parte_id             | UUID FK       | → partes. Nullable        |
| catalogo_unidad_id   | UUID FK       | → catalogo_unidades. Nullable |
| descripcion          | VARCHAR(500)  | Libre si no hay parte     |
| cantidad             | INTEGER       | Default 1                 |
| precio_unitario      | DECIMAL(12,2) |                           |
| descuento            | DECIMAL(12,2) | Default 0                 |
| subtotal             | DECIMAL(12,2) |                           |

---

## TALLER

### `ordenes_servicio`
| Columna               | Tipo          | Notas                                            |
|-----------------------|---------------|--------------------------------------------------|
| id                    | UUID PK       |                                                  |
| tenant_id             | UUID FK       |                                                  |
| sucursal_id           | UUID FK       |                                                  |
| titular_id            | UUID FK       | → clientes. Quien paga y factura                 |
| vehiculo_id           | UUID FK       | → vehiculos_cliente                              |
| contacto_recepcion_id | UUID FK       | → contactos. Nullable. Quien entregó el vehículo |
| nombre_recepcion      | VARCHAR(200)  | Nullable. Si no está en el sistema               |
| telefono_recepcion    | VARCHAR(20)   | Nullable                                         |
| usuario_id            | UUID FK       | → users. Quien abrió la OS                       |
| mecanico_id           | UUID FK       | → users. Nullable                                |
| cita_id               | UUID FK       | → citas. Nullable. Relación unidireccional — citas NO tienen FK a OS. |
| cotizacion_id         | UUID FK       | → cotizaciones. Nullable                         |
| folio                 | VARCHAR(50)   | `OS-{YYYY}-{0001}`                              |
| estatus               | ENUM          | `RECIBIDO`,`DIAGNOSTICO`,`EN_PROCESO`,`EN_ESPERA_PARTES`,`LISTO`,`ENTREGADO`,`CANCELADO` |
| falla_reportada       | TEXT          |                                                  |
| diagnostico           | TEXT          | Nullable                                         |
| trabajo_realizado     | TEXT          | Nullable                                         |
| km_entrada            | INTEGER       |                                                  |
| km_salida             | INTEGER       | Nullable                                         |
| costo_mano_obra       | DECIMAL(12,2) | Default 0                                        |
| costo_partes          | DECIMAL(12,2) | Default 0. Calculado de os_partes                |
| descuento             | DECIMAL(12,2) | Default 0                                        |
| total                 | DECIMAL(12,2) |                                                  |
| metodo_pago           | ENUM          | Nullable. Se llena al entregar                   |
| cfdi_uuid             | VARCHAR(100)  | Nullable                                         |
| fecha_entrada         | TIMESTAMP     |                                                  |
| fecha_promesa         | TIMESTAMP     | Nullable                                         |
| fecha_listo           | TIMESTAMP     | Nullable                                         |
| fecha_entrega         | TIMESTAMP     | Nullable                                         |
| created_at            | TIMESTAMP     |                                                  |
| updated_at            | TIMESTAMP     |                                                  |

**Gates de transición** — ver `docs/modules/taller.md`

---

### `checklist_recepcion`
| Columna            | Tipo         | Notas                               |
|--------------------|--------------|-------------------------------------|
| id                 | UUID PK      |                                     |
| orden_servicio_id  | UUID FK      | UNIQUE                              |
| usuario_id         | UUID FK      | Quien hizo la recepción             |
| nivel_gasolina     | INTEGER      | 0–100                               |
| km_entrada         | INTEGER      |                                     |
| tiene_llanta_extra | BOOLEAN      | Default false                       |
| tiene_herramienta  | BOOLEAN      | Default false                       |
| tiene_documentos   | BOOLEAN      | Default false                       |
| tiene_tapetes      | BOOLEAN      | Default false                       |
| observaciones      | TEXT         | Nullable                            |
| danos_descripcion  | TEXT         | Nullable                            |
| firma_cliente_key  | VARCHAR(500) | Nullable. PNG en B2                 |
| fotos_keys         | TEXT[]       | Nullable. Array de keys en B2       |
| created_at         | TIMESTAMP    |                                     |

---

### `os_partes`
| Columna           | Tipo          | Notas              |
|-------------------|---------------|--------------------|
| id                | UUID PK       |                    |
| orden_servicio_id | UUID FK       |                    |
| parte_id          | UUID FK       |                    |
| cantidad          | INTEGER       |                    |
| precio_unitario   | DECIMAL(12,2) |                    |
| subtotal          | DECIMAL(12,2) |                    |

---

### `os_tiempo`
Registro de tiempo trabajado por mecánico en una OS.

| Columna           | Tipo      | Notas                                 |
|-------------------|-----------|---------------------------------------|
| id                | UUID PK   |                                       |
| orden_servicio_id | UUID FK   |                                       |
| mecanico_id       | UUID FK   | → users                               |
| inicio            | TIMESTAMP |                                       |
| fin               | TIMESTAMP | Nullable. Null = activo en este momento|
| minutos           | INTEGER   | Calculado al cerrar (fin - inicio)    |
| notas             | TEXT      | Nullable                              |
| created_at        | TIMESTAMP |                                       |

---

### `garantias`
| Columna              | Tipo         | Notas                                    |
|----------------------|--------------|------------------------------------------|
| id                   | UUID PK      |                                          |
| tenant_id            | UUID FK      |                                          |
| venta_unidad_id      | UUID FK      | → venta_unidades. Nullable               |
| orden_servicio_id    | UUID FK      | → ordenes_servicio. Nullable             |
| cliente_id           | UUID FK      | → clientes                               |
| vehiculo_id          | UUID FK      | → vehiculos_cliente                      |
| autorizador_id       | UUID FK      | → users. GERENTE_SUCURSAL que autorizó   |
| tipo                 | ENUM         | `UNIDAD`,`REFACCION`,`SERVICIO`          |
| descripcion          | TEXT         |                                          |
| estatus              | ENUM         | `ABIERTA`,`EN_PROCESO`,`RESUELTA`,`RECHAZADA` |
| resolucion           | TEXT         | Nullable                                 |
| nueva_os_id          | UUID FK      | → ordenes_servicio. Nullable. OS creada  |
| fecha_inicio         | DATE         |                                          |
| fecha_fin            | DATE         |                                          |
| created_at           | TIMESTAMP    |                                          |
| updated_at           | TIMESTAMP    |                                          |

---

## AGENDA

### `citas`
| Columna              | Tipo         | Notas                                        |
|----------------------|--------------|----------------------------------------------|
| id                   | UUID PK      |                                              |
| tenant_id            | UUID FK      |                                              |
| sucursal_id          | UUID FK      |                                              |
| cliente_id           | UUID FK      | → clientes. Nullable (portal público)        |
| vehiculo_id          | UUID FK      | → vehiculos_cliente. Nullable                |
| mecanico_id          | UUID FK      | → users. Nullable                            |
| origen               | ENUM         | `INTERNO`,`PORTAL_PUBLICO`                   |
| estatus              | ENUM         | `PENDIENTE_CONFIRMACION`,`AGENDADA`,`CONFIRMADA`,`COMPLETADA`,`CANCELADA`,`NO_SE_PRESENTO` |
| tipo_servicio        | VARCHAR(200) |                                              |
| nombre_cliente       | VARCHAR(200) | Para portal público sin registro             |
| telefono_cliente     | VARCHAR(20)  | Para portal público sin registro             |
| notas                | TEXT         | Nullable                                     |
| fecha_hora           | TIMESTAMP    |                                              |
| duracion_min         | INTEGER      | Default 60                                   |
| recordatorio_enviado | BOOLEAN      | Default false                                |
| created_at           | TIMESTAMP    |                                              |
| updated_at           | TIMESTAMP    |                                              |

---

## COMISIONES

### `comisiones_periodo`
| Columna     | Tipo         | Notas                           |
|-------------|--------------|---------------------------------|
| id          | UUID PK      |                                 |
| tenant_id   | UUID FK      |                                 |
| sucursal_id | UUID FK      |                                 |
| periodo     | DATE         | Primer día del período          |
| tipo        | ENUM         | `QUINCENAL`,`MENSUAL`           |
| estatus     | ENUM         | `ABIERTO`,`EN_REVISION`,`APROBADO`,`PAGADO` |
| aprobador_id| UUID FK      | → users. Nullable               |
| created_at  | TIMESTAMP    |                                 |
| updated_at  | TIMESTAMP    |                                 |

### `comisiones_detalle`
| Columna            | Tipo          | Notas                                       |
|--------------------|---------------|---------------------------------------------|
| id                 | UUID PK       |                                             |
| periodo_id         | UUID FK       | → comisiones_periodo                        |
| usuario_id         | UUID FK       | → users                                     |
| referencia_id      | UUID          | ID de venta/OS/venta_unidad                 |
| referencia_tipo    | VARCHAR(50)   | `VENTA`,`ORDEN_SERVICIO`,`VENTA_UNIDAD`    |
| concepto           | TEXT          | Descripción de la comisión                  |
| base               | DECIMAL(12,2) | Monto base sobre el que se calcula          |
| monto              | DECIMAL(12,2) | Monto de la comisión                        |
| estatus            | ENUM          | `PENDIENTE`,`APROBADO`,`RECHAZADO`          |
| created_at         | TIMESTAMP     |                                             |
| updated_at         | TIMESTAMP     |                                             |

---

## FISCAL

### `cfdi_log`
| Columna           | Tipo          | Notas                                    |
|-------------------|---------------|------------------------------------------|
| id                | UUID PK       |                                          |
| tenant_id         | UUID FK       |                                          |
| sucursal_id       | UUID FK       | → sucursales. Emisor                     |
| referencia_id     | UUID          | ID de venta, OS o venta_unidad           |
| referencia_tipo   | VARCHAR(50)   | `VENTA`,`ORDEN_SERVICIO`,`VENTA_UNIDAD`,`PAGO` |
| tipo_cfdi         | ENUM          | `INGRESO`,`EGRESO`,`PAGO`                |
| uuid_sat          | VARCHAR(100)  | UNIQUE                                   |
| serie             | VARCHAR(10)   |                                          |
| folio_fiscal      | VARCHAR(20)   |                                          |
| xml_key           | VARCHAR(500)  | Key en B2                                |
| pdf_key           | VARCHAR(500)  | Key en B2                                |
| total             | DECIMAL(12,2) |                                          |
| estatus           | ENUM          | `VIGENTE`,`CANCELADO`                    |
| motivo_cancelacion| VARCHAR(200)  | Nullable. Clave SAT                      |
| cancelado_por_id  | UUID FK       | → users. Nullable                        |
| timbrado_at       | TIMESTAMP     |                                          |
| cancelado_at      | TIMESTAMP     | Nullable                                 |

---

## INFRAESTRUCTURA

### `notificaciones_log`
| Columna       | Tipo         | Notas                                   |
|---------------|--------------|-----------------------------------------|
| id            | UUID PK      |                                         |
| tenant_id     | UUID FK      |                                         |
| sucursal_id   | UUID FK      | → sucursales. Remitente                 |
| destinatario  | VARCHAR(300) | Teléfono o email                        |
| canal         | ENUM         | `WHATSAPP`,`EMAIL`,`SMS`                |
| tipo          | VARCHAR(100) | `CITA_CONFIRMADA`,`OS_LISTA`, etc.      |
| referencia_id | UUID         | Nullable                                |
| asunto        | VARCHAR(500) | Nullable. Email                         |
| mensaje       | TEXT         |                                         |
| estatus       | ENUM         | `PENDIENTE`,`ENVIADO`,`FALLIDO`         |
| intentos      | INTEGER      | Default 0                               |
| error         | TEXT         | Nullable                                |
| enviado_at    | TIMESTAMP    | Nullable                                |
| created_at    | TIMESTAMP    |                                         |

### `audit_log`
Append-only. Sin soft delete ni updated_at.

| Columna         | Tipo         | Notas                          |
|-----------------|--------------|--------------------------------|
| id              | UUID PK      |                                |
| tenant_id       | UUID          | Nullable                      |
| usuario_id      | UUID          | Nullable                      |
| accion          | ENUM         | `CREATE`,`UPDATE`,`DELETE`,`LOGIN`,`LOGOUT`,`APPROVE`,`CANCEL` |
| tabla           | VARCHAR(100) |                                |
| registro_id     | UUID          | Nullable                      |
| payload_antes   | JSONB        | Nullable                       |
| payload_despues | JSONB        | Nullable                       |
| ip              | VARCHAR(50)  | Nullable                       |
| user_agent      | VARCHAR(500) | Nullable                       |
| created_at      | TIMESTAMP    |                                |
