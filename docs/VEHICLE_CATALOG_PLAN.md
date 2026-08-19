# Plan: Catálogos de Vehículo (Marca → Modelo → Año → Versión → Colores)

> Modelo: Planificación → Implementación → Revisión

---

## 1. FASE PLANIFICACIÓN

### 1.1 Objetivo
Implementar catálogos jerárquicos para Marca, Modelo, Año, Versión, Color interior y Color exterior, con:
- Combos que muestren opciones existentes
- Opción "Crear nuevo" si no existe
- Validación fuzzy (evitar duplicados por typos) en todos los niveles

### 1.2 Jerarquía
```
global_brands (marca)
    └── vehicle_models (modelo por marca)
            └── [año: número]
                    └── vehicle_versions (versión por marca + modelo + año)
                            └── vehicle_colors (interior/exterior por marca + modelo + versión)
```

### 1.3 Tablas nuevas

| Tabla | Campos | Índices |
|-------|--------|---------|
| vehicle_models | id, brand_id, name, created_at | UNIQUE(brand_id, name) |
| vehicle_versions | id, brand_id, model_id, year, name, created_at | UNIQUE(brand_id, model_id, year, name) |
| vehicle_colors | id, brand_id, model_id, version_id, name, color_type, created_at | UNIQUE(brand_id, model_id, version_id, name, color_type) |

### 1.4 Validación fuzzy
- Umbral: 0.85 (string-similarity-js)
- Aplicar en: marca, modelo, versión, color interior, color exterior
- Año: validación numérica (1900-2100)

### 1.5 Estrategia de migración
- **Fase 1**: Crear tablas nuevas sin modificar global_models ni catalog_units
- **Fase 2**: Migrar datos existentes a las nuevas tablas
- **Fase 3**: Añadir columnas FK opcionales a catalog_units (exterior_color_id, interior_color_id)
- **Fase 4**: Frontend usa nuevos catálogos; se mantienen strings para compatibilidad

---

## 2. FASE IMPLEMENTACIÓN

### 2.1 Backend
- [ ] Migración: vehicle_models, vehicle_versions, vehicle_colors
- [ ] Entidades TypeORM
- [ ] Módulos NestJS (vehicle-models, vehicle-versions, vehicle-colors)
- [ ] Servicios con CRUD + validación fuzzy
- [ ] Controladores y endpoints
- [ ] Fuzzy en GlobalBrandsService

### 2.2 Frontend
- [ ] Servicios Angular para cada catálogo
- [ ] Componente CatalogComboSelector reutilizable
- [ ] Integración en unidad-form, modelo-global-form, vehiculo-quick-dialog

### 2.3 Migración de datos
- [ ] Script/migración para poblar vehicle_models desde global_models
- [ ] Poblar vehicle_versions
- [ ] Poblar vehicle_colors desde catalog_units.color

---

## 3. FASE REVISIÓN

### 3.1 Implementado (marzo 2026)

| Componente | Estado |
|------------|--------|
| **Backend** | |
| vehicle_models | Tabla, entidad, servicio, API, fuzzy |
| vehicle_versions | Tabla, entidad, servicio, API, fuzzy |
| vehicle_colors | Tabla, entidad, servicio, API, fuzzy |
| GlobalBrandsService | Validación fuzzy añadida |
| Migración seed | Datos desde global_models y catalog_units |
| **Frontend** | |
| VehicleModelsService | Listar por marca, crear |
| VehicleVersionsService | Listar por marca+modelo+año, crear |
| VehicleColorsService | Listar por versión+tipo, crear |
| VehicleCatalogCombo | Componente para combo de colores |

### 3.2 Pendiente de integración
- Unidad-form: reemplazar inputs de versión/color por combos de catálogo
- Modelo-global-form: usar vehicle_models si se migra
- Vehiculo-quick-dialog (taller): usar catálogos
- Añadir columnas exterior_color_id, interior_color_id a catalog_units (migración futura)

### 3.3 Endpoints API
- `GET /vehicle-models?brandId=xxx`
- `POST /vehicle-models` { brandId, name }
- `GET /vehicle-versions?brandId=&modelId=&year=`
- `POST /vehicle-versions` { brandId, modelId, year, name }
- `GET /vehicle-colors?versionId=&colorType=INTERIOR|EXTERIOR`
- `POST /vehicle-colors` { brandId, modelId, versionId, name, colorType }
