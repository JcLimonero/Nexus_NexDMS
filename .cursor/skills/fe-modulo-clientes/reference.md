# Referencia API Clientes

## Respuestas

### GET /api/v1/clients
```json
{
  "data": [ { /* Client */ } ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### GET /api/v1/clients/:id
```json
{
  "id": "uuid",
  "clientType": "INDIVIDUAL",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "333-001-2345",
  /* ... resto de Client */
  "contacts": [ { "id", "name", "phone", "email", ... } ],
  "vehicles": [ { "id", "brand", "model", "year", "plate", ... } ],
  "dataQuality": {
    "score": 75,
    "level": "Operativo",
    "missing": [ "rfc", "taxRegime" ]
  }
}
```

### POST /api/v1/clients
Body mínimo: `{ "clientType": "INDIVIDUAL", "phone": "333-001-2345" }`
Para persona: añadir `firstName` o `lastName`
Para empresa: añadir `companyName`

### Filtros (query params)
- `search`: string, busca en nombre, apellido, razón social, teléfono, RFC
- `clientType`: INDIVIDUAL | BUSINESS
- `page`: number, default 1
- `limit`: number, default 20, max 100

## Score de calidad
- Básico: 0-39%
- Parcial: 40-69%
- Operativo: 70-89%
- Completo: 90-100%

Campos que bloquean: email (documentos), rfc+taxRegime+taxPostalCode (CFDI), hasVehicle (OS), address (contratos), curp (financiamiento).
