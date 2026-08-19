import { EntityManager, IsNull } from 'typeorm';
import { Part, PartVehicleTypeEnum } from '../parts/entities/part.entity';
import { PartCategory } from '../part-categories/entities/part-category.entity';
import { StockLocation } from '../stock-locations/entities/stock-location.entity';
import { Client, ClientTypeEnum } from '../clients/entities/client.entity';
import {
  CustomerVehicle,
  VehicleTypeEnum,
} from '../customer-vehicles/entities/customer-vehicle.entity';
import { Branch } from '../branches/entities/branch.entity';
import {
  ServiceType,
  ServiceTypeCategoryEnum,
} from '../service-types/entities/service-type.entity';
import { ServiceKit } from '../service-kits/entities/service-kit.entity';
import { UnitAccessory } from '../unit-accessories/entities/unit-accessory.entity';

/** Una columna de la plantilla de importación. */
export interface ColDef {
  /** Encabezado que se ve en el Excel. */
  header: string;
  /** Clave interna a la que se mapea la celda. */
  key: string;
  required?: boolean;
  /** Valor de ejemplo que va en la fila guía de la plantilla. */
  ejemplo?: string | number;
  /** Nota/ayuda para la hoja de instrucciones. */
  nota?: string;
  /** Si es una lista cerrada, sus valores válidos. */
  opciones?: string[];
}

/** Fila leída del Excel: sus datos por clave + el número de fila real. */
export type Fila = { __fila: number } & Record<string, string>;

export interface FilaError {
  fila: number;
  mensaje: string;
}

export interface ImportCtx {
  em: EntityManager;
  tenantId: string;
  userId: string;
}

export interface ImportDef {
  key: string;
  label: string;
  columnas: ColDef[];
  importar: (
    filas: Fila[],
    ctx: ImportCtx,
  ) => Promise<{ insertados: number; errores: FilaError[] }>;
}

// ── Utilidades comunes ──────────────────────────────────────────────

/** Sucursal del renglón: por nombre si viene, si no la principal del cliente. */
async function resolverSucursal(
  em: EntityManager,
  tenantId: string,
  nombre?: string,
): Promise<Branch | null> {
  const repo = em.getRepository(Branch);
  if (nombre?.trim()) {
    const b = await repo
      .createQueryBuilder('b')
      .where('b.tenant_id = :t', { t: tenantId })
      .andWhere('LOWER(b.name) = LOWER(:n)', { n: nombre.trim() })
      .getOne();
    if (b) return b;
  }
  return repo
    .createQueryBuilder('b')
    .where('b.tenant_id = :t', { t: tenantId })
    .orderBy('b.is_primary', 'DESC')
    .getOne();
}

function num(v: string | undefined): number {
  const n = Number(String(v ?? '').replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function entero(v: string | undefined): number {
  return Math.trunc(num(v));
}

/** Normaliza un valor a un miembro de un enum (acepta minúsculas/espacios). */
function aEnum<T extends string>(
  v: string | undefined,
  valores: readonly T[],
): T | null {
  const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  return (valores as readonly string[]).includes(s) ? (s as T) : null;
}

// ── Definiciones ────────────────────────────────────────────────────

export const IMPORTABLES: ImportDef[] = [
  // Inventario de refacciones ────────────────────────────────────────
  {
    key: 'parts',
    label: 'Inventario de refacciones',
    columnas: [
      { header: 'Nombre', key: 'name', required: true, ejemplo: 'Balata delantera' },
      { header: 'SKU', key: 'sku', ejemplo: 'BAL-DEL-01', nota: 'Si se omite, se genera uno.' },
      { header: 'Código de barras', key: 'barcode', ejemplo: '7501234567890' },
      {
        header: 'Tipo de vehículo',
        key: 'vehicleType',
        required: true,
        ejemplo: 'CAR',
        opciones: ['MOTORCYCLE', 'CAR', 'BOTH'],
      },
      { header: 'Categoría', key: 'categoria', ejemplo: 'Frenos', nota: 'Debe existir en el catálogo de categorías; si no, se deja sin categoría.' },
      { header: 'Ubicación', key: 'ubicacion', ejemplo: 'A-01', nota: 'Código o zona de una ubicación existente.' },
      { header: 'Precio compra', key: 'purchasePrice', required: true, ejemplo: 180 },
      { header: 'Precio público', key: 'publicPrice', required: true, ejemplo: 380 },
      { header: 'Precio mayoreo', key: 'wholesalePrice', ejemplo: 340 },
      { header: 'Precio empresa', key: 'businessPrice', ejemplo: 350 },
      { header: 'Existencia inicial', key: 'stock', ejemplo: 12 },
      { header: 'Mínimo', key: 'minStock', ejemplo: 4 },
      { header: 'Sucursal', key: 'sucursal', nota: 'Opcional; si se omite, la principal.' },
    ],
    async importar(filas, { em, tenantId }) {
      const errores: FilaError[] = [];
      let insertados = 0;
      const partRepo = em.getRepository(Part);
      const catRepo = em.getRepository(PartCategory);
      const locRepo = em.getRepository(StockLocation);

      for (const f of filas) {
        if (!f.name?.trim()) {
          errores.push({ fila: f.__fila, mensaje: 'Falta el nombre' });
          continue;
        }
        const tipo = aEnum(f.vehicleType, ['MOTORCYCLE', 'CAR', 'BOTH']);
        if (!tipo) {
          errores.push({ fila: f.__fila, mensaje: 'Tipo de vehículo inválido (MOTORCYCLE/CAR/BOTH)' });
          continue;
        }
        const sucursal = await resolverSucursal(em, tenantId, f.sucursal);
        if (!sucursal) {
          errores.push({ fila: f.__fila, mensaje: 'El cliente no tiene sucursal' });
          continue;
        }
        let categoryId: string | null = null;
        if (f.categoria?.trim()) {
          const cat = await catRepo
            .createQueryBuilder('c')
            .where('c.tenant_id = :t', { t: tenantId })
            .andWhere('LOWER(c.name) = LOWER(:n)', { n: f.categoria.trim() })
            .getOne();
          categoryId = cat?.id ?? null;
        }
        let locationId: string | null = null;
        if (f.ubicacion?.trim()) {
          const loc = await locRepo
            .createQueryBuilder('l')
            .where('l.tenant_id = :t', { t: tenantId })
            .andWhere('l.branch_id = :b', { b: sucursal.id })
            .andWhere('(LOWER(l.code) = LOWER(:n) OR LOWER(l.zone) = LOWER(:n))', { n: f.ubicacion.trim() })
            .getOne();
          locationId = loc?.id ?? null;
        }
        const compra = num(f.purchasePrice);
        const publico = num(f.publicPrice);
        const parte = partRepo.create({
          tenantId,
          branchId: sucursal.id,
          categoryId,
          locationId,
          sku: f.sku?.trim() || `SKU-${Date.now()}-${insertados}`,
          barcode: f.barcode?.trim() || null,
          name: f.name.trim(),
          vehicleType: tipo as PartVehicleTypeEnum,
          purchasePrice: compra,
          publicPrice: publico,
          wholesalePrice: num(f.wholesalePrice) || publico,
          businessPrice: num(f.businessPrice) || publico,
          averageCost: compra,
          stockQuantity: entero(f.stock),
          minStock: entero(f.minStock) || 1,
          isActive: true,
        });
        await partRepo.save(parte);
        insertados++;
      }
      return { insertados, errores };
    },
  },

  // Categorías de refacciones ─────────────────────────────────────────
  {
    key: 'part-categories',
    label: 'Categorías de refacciones',
    columnas: [
      { header: 'Nombre', key: 'name', required: true, ejemplo: 'Frenos' },
      { header: 'Descripción', key: 'description', ejemplo: 'Balatas, discos, líquido' },
    ],
    async importar(filas, { em, tenantId }) {
      const errores: FilaError[] = [];
      let insertados = 0;
      const repo = em.getRepository(PartCategory);
      for (const f of filas) {
        if (!f.name?.trim()) {
          errores.push({ fila: f.__fila, mensaje: 'Falta el nombre' });
          continue;
        }
        await repo.save(
          repo.create({
            tenantId,
            name: f.name.trim(),
            description: f.description?.trim() || null,
            isActive: true,
          }),
        );
        insertados++;
      }
      return { insertados, errores };
    },
  },

  // Ubicaciones de almacén ────────────────────────────────────────────
  {
    key: 'stock-locations',
    label: 'Ubicaciones de almacén',
    columnas: [
      { header: 'Zona', key: 'zone', required: true, ejemplo: 'Almacén' },
      { header: 'Código', key: 'code', ejemplo: 'A-01' },
      { header: 'Pasillo', key: 'aisle', ejemplo: 'A' },
      { header: 'Estante', key: 'shelf', ejemplo: '1' },
      { header: 'Nivel', key: 'level', ejemplo: '2' },
      { header: 'Sucursal', key: 'sucursal', nota: 'Opcional; si se omite, la principal.' },
    ],
    async importar(filas, { em, tenantId }) {
      const errores: FilaError[] = [];
      let insertados = 0;
      const repo = em.getRepository(StockLocation);
      for (const f of filas) {
        if (!f.zone?.trim()) {
          errores.push({ fila: f.__fila, mensaje: 'Falta la zona' });
          continue;
        }
        const sucursal = await resolverSucursal(em, tenantId, f.sucursal);
        if (!sucursal) {
          errores.push({ fila: f.__fila, mensaje: 'El cliente no tiene sucursal' });
          continue;
        }
        await repo.save(
          repo.create({
            tenantId,
            branchId: sucursal.id,
            zone: f.zone.trim(),
            code: f.code?.trim() || f.zone.trim(),
            aisle: f.aisle?.trim() || null,
            shelf: f.shelf?.trim() || null,
            level: f.level?.trim() || null,
            isActive: true,
          }),
        );
        insertados++;
      }
      return { insertados, errores };
    },
  },

  // Clientes ──────────────────────────────────────────────────────────
  {
    key: 'clients',
    label: 'Clientes',
    columnas: [
      {
        header: 'Tipo',
        key: 'clientType',
        required: true,
        ejemplo: 'INDIVIDUAL',
        opciones: ['INDIVIDUAL', 'BUSINESS'],
      },
      { header: 'Nombre', key: 'firstName', ejemplo: 'Juan', nota: 'Para persona física.' },
      { header: 'Apellido', key: 'lastName', ejemplo: 'Pérez' },
      { header: 'Empresa', key: 'companyName', ejemplo: 'Transportes SA', nota: 'Para persona moral.' },
      { header: 'Teléfono', key: 'phone', required: true, ejemplo: '3311000001' },
      { header: 'Email', key: 'email', ejemplo: 'juan@correo.com' },
      { header: 'RFC', key: 'rfc', ejemplo: 'XAXX010101000' },
    ],
    async importar(filas, { em, tenantId }) {
      const errores: FilaError[] = [];
      let insertados = 0;
      const repo = em.getRepository(Client);
      for (const f of filas) {
        const tipo = aEnum(f.clientType, ['INDIVIDUAL', 'BUSINESS']);
        if (!tipo) {
          errores.push({ fila: f.__fila, mensaje: 'Tipo inválido (INDIVIDUAL/BUSINESS)' });
          continue;
        }
        if (!f.phone?.trim()) {
          errores.push({ fila: f.__fila, mensaje: 'Falta el teléfono' });
          continue;
        }
        await repo.save(
          repo.create({
            tenantId,
            clientType: tipo as ClientTypeEnum,
            firstName: f.firstName?.trim() || null,
            lastName: f.lastName?.trim() || null,
            companyName: f.companyName?.trim() || null,
            phone: f.phone.trim(),
            email: f.email?.trim() || null,
            rfc: f.rfc?.trim() || null,
          }),
        );
        insertados++;
      }
      return { insertados, errores };
    },
  },

  // Vehículos de clientes ─────────────────────────────────────────────
  {
    key: 'customer-vehicles',
    label: 'Vehículos de clientes',
    columnas: [
      { header: 'Teléfono del cliente', key: 'clientePhone', required: true, ejemplo: '3311000001', nota: 'Debe coincidir con un cliente existente.' },
      {
        header: 'Tipo',
        key: 'vehicleType',
        required: true,
        ejemplo: 'CAR',
        opciones: ['MOTORCYCLE', 'CAR', 'SUV', 'MINIVAN', 'TRUCK', 'VAN', 'CARGO_VAN', 'BOX_TRUCK'],
      },
      { header: 'Marca', key: 'make', required: true, ejemplo: 'Nissan' },
      { header: 'Modelo', key: 'model', required: true, ejemplo: 'Versa' },
      { header: 'Año', key: 'year', required: true, ejemplo: 2020 },
      { header: 'Color', key: 'color', ejemplo: 'Gris' },
      { header: 'Placa', key: 'plate', ejemplo: 'JAL-1234' },
      { header: 'VIN', key: 'vin', ejemplo: '3N1...' },
      { header: 'Kilometraje', key: 'mileage', ejemplo: 45000 },
    ],
    async importar(filas, { em, tenantId }) {
      const errores: FilaError[] = [];
      let insertados = 0;
      const repo = em.getRepository(CustomerVehicle);
      const clientRepo = em.getRepository(Client);
      for (const f of filas) {
        const tipo = aEnum(f.vehicleType, [
          'MOTORCYCLE', 'CAR', 'SUV', 'MINIVAN', 'TRUCK', 'VAN', 'CARGO_VAN', 'BOX_TRUCK',
        ]);
        if (!tipo) {
          errores.push({ fila: f.__fila, mensaje: 'Tipo de vehículo inválido' });
          continue;
        }
        if (!f.make?.trim() || !f.model?.trim() || !f.year) {
          errores.push({ fila: f.__fila, mensaje: 'Faltan marca, modelo o año' });
          continue;
        }
        const dueno = await clientRepo.findOne({
          where: { tenantId, phone: (f.clientePhone ?? '').trim(), deletedAt: IsNull() },
        });
        if (!dueno) {
          errores.push({ fila: f.__fila, mensaje: `No hay cliente con teléfono ${f.clientePhone}` });
          continue;
        }
        await repo.save(
          repo.create({
            tenantId,
            ownerId: dueno.id,
            vehicleType: tipo as VehicleTypeEnum,
            make: f.make.trim(),
            model: f.model.trim(),
            year: entero(f.year),
            color: f.color?.trim() || null,
            plate: f.plate?.trim() || null,
            vin: f.vin?.trim() || null,
            mileage: entero(f.mileage),
          }),
        );
        insertados++;
      }
      return { insertados, errores };
    },
  },
  // Tipos de servicio ────────────────────────────────────────────────
  {
    key: 'service-types',
    label: 'Tipos de servicio',
    columnas: [
      { header: 'Nombre', key: 'name', required: true, ejemplo: 'Servicio de 10,000 km' },
      { header: 'Código', key: 'code', required: true, ejemplo: 'SRV-10K' },
      {
        header: 'Categoría',
        key: 'category',
        required: true,
        ejemplo: 'MAINTENANCE',
        opciones: ['MAINTENANCE', 'REVISION', 'DIAGNOSIS', 'REPAIR', 'OTHER'],
      },
      { header: 'Descripción', key: 'description', ejemplo: 'Aceite, filtros, revisión' },
      { header: 'Duración (min)', key: 'durationMin', ejemplo: 60 },
    ],
    async importar(filas, { em, tenantId }) {
      const errores: FilaError[] = [];
      let insertados = 0;
      const repo = em.getRepository(ServiceType);
      for (const f of filas) {
        if (!f.name?.trim() || !f.code?.trim()) {
          errores.push({ fila: f.__fila, mensaje: 'Faltan nombre o código' });
          continue;
        }
        const cat = aEnum(f.category, [
          'MAINTENANCE', 'REVISION', 'DIAGNOSIS', 'REPAIR', 'OTHER',
        ]);
        if (!cat) {
          errores.push({ fila: f.__fila, mensaje: 'Categoría inválida' });
          continue;
        }
        await repo.save(
          repo.create({
            tenantId,
            branchId: null,
            code: f.code.trim(),
            name: f.name.trim(),
            category: cat as ServiceTypeCategoryEnum,
            description: f.description?.trim() || null,
            durationMin: entero(f.durationMin) || 60,
          }),
        );
        insertados++;
      }
      return { insertados, errores };
    },
  },

  // Kits de servicio ──────────────────────────────────────────────────
  {
    key: 'service-kits',
    label: 'Kits de servicio',
    columnas: [
      { header: 'Código', key: 'code', required: true, ejemplo: 'KIT-AFIN' },
      { header: 'Nombre', key: 'name', required: true, ejemplo: 'Kit de afinación' },
      { header: 'Descripción', key: 'description', ejemplo: 'Bujías, filtros, aceite' },
      { header: 'Minutos de mano de obra', key: 'laborMinutes', ejemplo: 90 },
      { header: 'Precio de mano de obra', key: 'laborPrice', ejemplo: 650 },
    ],
    async importar(filas, { em, tenantId }) {
      const errores: FilaError[] = [];
      let insertados = 0;
      const repo = em.getRepository(ServiceKit);
      for (const f of filas) {
        if (!f.name?.trim() || !f.code?.trim()) {
          errores.push({ fila: f.__fila, mensaje: 'Faltan nombre o código' });
          continue;
        }
        await repo.save(
          repo.create({
            tenantId,
            code: f.code.trim(),
            kitType: 'GENERICO',
            name: f.name.trim(),
            description: f.description?.trim() || null,
            laborMinutes: entero(f.laborMinutes),
            laborPrice: num(f.laborPrice),
            active: true,
          }),
        );
        insertados++;
      }
      return { insertados, errores };
    },
  },

  // Accesorios de unidades ────────────────────────────────────────────
  {
    key: 'unit-accessories',
    label: 'Accesorios de unidades',
    columnas: [
      { header: 'Nombre', key: 'name', required: true, ejemplo: 'Tapetes' },
      { header: 'SKU', key: 'sku', ejemplo: 'ACC-TAP' },
      { header: 'Precio', key: 'price', ejemplo: 890 },
      { header: 'Clave SAT', key: 'satProductKey', ejemplo: '25174800' },
      { header: 'Descripción', key: 'description', ejemplo: 'Juego de tapetes de hule' },
    ],
    async importar(filas, { em, tenantId }) {
      const errores: FilaError[] = [];
      let insertados = 0;
      const repo = em.getRepository(UnitAccessory);
      for (const f of filas) {
        if (!f.name?.trim()) {
          errores.push({ fila: f.__fila, mensaje: 'Falta el nombre' });
          continue;
        }
        await repo.save(
          repo.create({
            tenantId,
            name: f.name.trim(),
            sku: f.sku?.trim() || null,
            price: num(f.price),
            satProductKey: f.satProductKey?.trim() || null,
            description: f.description?.trim() || null,
            isActive: true,
          }),
        );
        insertados++;
      }
      return { insertados, errores };
    },
  },
];

export function getImportDef(key: string): ImportDef | undefined {
  return IMPORTABLES.find((d) => d.key === key);
}
