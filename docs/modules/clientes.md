# Módulo: Clientes y Contactos

## Tres roles en el contexto de una OS
- **Titular:** quien paga y factura (CFDI). Siempre requerido para cerrar.
- **Propietario del vehículo:** dueño registrado de la unidad.
- **Contacto de recepción:** quien físicamente entrega el vehículo. Puede ser diferente.

## Endpoints — Clientes

### GET /api/v1/clientes
Filtros: `search` (nombre, teléfono, RFC), `tipoCliente`, `esEmpresa`.
Scope aplicado automáticamente.

### GET /api/v1/clientes/:id
Incluye: vehículos registrados, contactos, historial de OS (últimas 5), historial de ventas (últimas 5), score de calidad de datos.

### POST /api/v1/clientes
**Campos mínimos requeridos:** `nombre`, `telefono`
**Body completo:**
```json
{
  "esEmpresa": false,
  "nombre": "Juan",
  "apellido": "Pérez",
  "razonSocial": null,
  "tipoCliente": "PUBLICO",
  "telefono": "333-001-2345",
  "telefonoAlt": null,
  "email": null,
  "rfc": null,
  "curp": null,
  "regimenFiscal": null,
  "cpFiscal": null,
  "direccion": null,
  "ciudad": null,
  "estado": null,
  "descuentoFijo": 0,
  "notas": null
}
```

### PATCH /api/v1/clientes/:id
Actualización parcial. Cualquier campo.

### DELETE /api/v1/clientes/:id
Soft delete. Solo si no tiene OS activas ni créditos vigentes.

## Endpoints — Contactos

### GET /api/v1/clientes/:id/contactos
### POST /api/v1/clientes/:id/contactos
**Body:** `{ nombre, apellido?, telefono, email?, puesto?, departamento?, esAutorizado, notas? }`

### PATCH /api/v1/clientes/:id/contactos/:contactoId
### DELETE /api/v1/clientes/:id/contactos/:contactoId

## Endpoints — Vehículos del cliente

### GET /api/v1/clientes/:id/vehiculos
### POST /api/v1/clientes/:id/vehiculos
**Body:** `{ tipoVehiculo, marca, modelo, anio, color?, placa?, numeroSerie?, numeroMotor?, kmActual?, contactoAsignadoId?, notas? }`

### PATCH /api/v1/clientes/:id/vehiculos/:vehiculoId
Incluye actualización de `kmActual` al traer al taller.

## Score de calidad de datos

| Campo         | Peso | Bloquea si falta                    |
|---------------|------|-------------------------------------|
| nombre        | 10   | —                                   |
| telefono      | 10   | —                                   |
| email         | 10   | Envío de documentos digitales       |
| rfc           | 25   | CFDI, garantías                     |
| regimen_fiscal| 10   | CFDI                                |
| cp_fiscal     | 5    | CFDI                                |
| vehiculo      | 15   | OS y taller                         |
| direccion     | 10   | Contratos                           |
| curp          | 5    | Financiamiento                      |

Niveles: Básico 0–39% · Parcial 40–69% · Operativo 70–89% · Completo 90–100%

## Búsqueda rápida para flujos de OS y POS
`GET /api/v1/clientes/buscar?q=333` — responde en <200ms con los primeros 8 resultados.
Busca en: nombre, apellido, teléfono, RFC.
