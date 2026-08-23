import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { MASTER_TENANT_ID } from '../../common/tenancy/master-tenant.const';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { PartCategory } from '../part-categories/entities/part-category.entity';
import { UnitAccessory } from '../unit-accessories/entities/unit-accessory.entity';
import { UnitLocation } from '../unit-locations/entities/unit-location.entity';
import { MechanicChecklistItem } from '../mechanic-checklist/entities/mechanic-checklist-item.entity';

type CampoTipo = 'string' | 'number' | 'boolean';

export interface CampoDef {
  prop: string;
  label: string;
  type: CampoTipo;
  required?: boolean;
}

interface CatalogoDef {
  key: string;
  label: string;
  entity: EntityTarget<ObjectLiteral>;
  fields: CampoDef[];
  /** Catálogos con sucursal: en el maestro se guardan sin sucursal (null). */
  branchScoped?: boolean;
}

/**
 * Gestor de catálogos "maestros": CRUD de las plantillas que viven en el tenant
 * maestro y que el wizard de alta copia a cada empresa nueva. Solo superadmin.
 *
 * Cada catálogo se maneja por su repositorio con una lista blanca de campos,
 * de modo que agregar un catálogo es solo una entrada en el registro.
 */
@Injectable()
export class MasterCatalogsService {
  constructor(private readonly dataSource: DataSource) {}

  private readonly catalogos: CatalogoDef[] = [
    {
      key: 'service-types',
      label: 'Tipos de servicio',
      entity: ServiceType,
      branchScoped: true,
      fields: [
        { prop: 'code', label: 'Código', type: 'string', required: true },
        { prop: 'name', label: 'Nombre', type: 'string', required: true },
        { prop: 'description', label: 'Descripción', type: 'string' },
        { prop: 'durationMin', label: 'Duración (min)', type: 'number' },
        { prop: 'isActive', label: 'Activo', type: 'boolean' },
      ],
    },
    {
      key: 'part-categories',
      label: 'Categorías de refacción',
      entity: PartCategory,
      fields: [
        { prop: 'name', label: 'Nombre', type: 'string', required: true },
        { prop: 'description', label: 'Descripción', type: 'string' },
        { prop: 'isActive', label: 'Activo', type: 'boolean' },
      ],
    },
    {
      key: 'unit-accessories',
      label: 'Accesorios de unidad',
      entity: UnitAccessory,
      fields: [
        { prop: 'name', label: 'Nombre', type: 'string', required: true },
        { prop: 'sku', label: 'SKU', type: 'string' },
        { prop: 'price', label: 'Precio', type: 'number' },
        { prop: 'category', label: 'Categoría', type: 'string' },
        { prop: 'description', label: 'Descripción', type: 'string' },
        { prop: 'isActive', label: 'Activo', type: 'boolean' },
      ],
    },
    {
      key: 'unit-locations',
      label: 'Ubicaciones de almacén',
      entity: UnitLocation,
      branchScoped: true,
      fields: [
        { prop: 'code', label: 'Código', type: 'string', required: true },
        { prop: 'zone', label: 'Zona', type: 'string' },
        { prop: 'space', label: 'Espacio', type: 'string' },
        { prop: 'description', label: 'Descripción', type: 'string' },
        { prop: 'isActive', label: 'Activo', type: 'boolean' },
      ],
    },
    {
      key: 'mechanic-checklist',
      label: 'Checklist del mecánico',
      entity: MechanicChecklistItem,
      fields: [
        { prop: 'code', label: 'Código', type: 'string' },
        { prop: 'name', label: 'Nombre', type: 'string', required: true },
        { prop: 'description', label: 'Descripción', type: 'string' },
        { prop: 'isRequired', label: 'Obligatorio', type: 'boolean' },
        { prop: 'sortOrder', label: 'Orden', type: 'number' },
      ],
    },
  ];

  private def(key: string): CatalogoDef {
    const d = this.catalogos.find((c) => c.key === key);
    if (!d) throw new NotFoundException(`Catálogo "${key}" no existe`);
    return d;
  }

  /** Metadatos de todos los catálogos (para pintar el gestor) + conteo. */
  async listarCatalogos(): Promise<
    { key: string; label: string; fields: CampoDef[]; count: number }[]
  > {
    return Promise.all(
      this.catalogos.map(async (c) => ({
        key: c.key,
        label: c.label,
        fields: c.fields,
        count: await this.dataSource
          .getRepository(c.entity)
          .count({ where: { tenantId: MASTER_TENANT_ID } }),
      })),
    );
  }

  entradas(key: string): Promise<ObjectLiteral[]> {
    const d = this.def(key);
    return this.dataSource.getRepository(d.entity).find({
      where: { tenantId: MASTER_TENANT_ID },
      order: { name: 'ASC' } as never,
    });
  }

  /** Toma solo los campos permitidos del cuerpo, con su tipo. */
  private saneados(d: CatalogoDef, body: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const f of d.fields) {
      if (body[f.prop] === undefined) continue;
      const v = body[f.prop];
      if (f.type === 'number') out[f.prop] = v === null ? null : Number(v);
      else if (f.type === 'boolean') out[f.prop] = !!v;
      else out[f.prop] = v === null ? null : String(v);
    }
    return out;
  }

  async crear(key: string, body: Record<string, unknown>) {
    const d = this.def(key);
    for (const f of d.fields) {
      if (f.required && !String(body[f.prop] ?? '').trim()) {
        throw new BadRequestException(`Falta "${f.label}"`);
      }
    }
    const repo = this.dataSource.getRepository(d.entity);
    const datos = this.saneados(d, body);
    const entidad = repo.create({
      ...datos,
      tenantId: MASTER_TENANT_ID,
      ...(d.branchScoped ? { branchId: null } : {}),
    } as never);
    return repo.save(entidad);
  }

  async actualizar(key: string, id: string, body: Record<string, unknown>) {
    const d = this.def(key);
    const repo = this.dataSource.getRepository(d.entity);
    const actual = await repo.findOne({
      where: { id, tenantId: MASTER_TENANT_ID } as never,
    });
    if (!actual) throw new NotFoundException('Entrada no encontrada');
    Object.assign(actual, this.saneados(d, body));
    return repo.save(actual);
  }

  async eliminar(key: string, id: string): Promise<void> {
    const d = this.def(key);
    const repo = this.dataSource.getRepository(d.entity);
    const actual = await repo.findOne({
      where: { id, tenantId: MASTER_TENANT_ID } as never,
    });
    if (!actual) throw new NotFoundException('Entrada no encontrada');
    await repo.remove(actual);
  }
}
