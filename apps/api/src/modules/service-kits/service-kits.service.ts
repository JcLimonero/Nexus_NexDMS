import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ServiceKit, ServiceKitItem } from './entities/service-kit.entity';
import { Part } from '../parts/entities/part.entity';

/** Disponibilidad de las refacciones del kit, resumida en un color. */
export type StockLight = 'VERDE' | 'AMBAR' | 'ROJO';

/** Alta de un kit propio del tenant. */
export interface NuevoKit {
  code?: string;
  kitType?: string;
  name: string;
  description?: string;
  vehicleTypes?: string[];
  laborMinutes?: number;
  laborPrice?: number;
  items?: {
    sku?: string;
    description: string;
    quantity?: number;
    unitPrice?: number;
  }[];
}

export interface KitItemResuelto {
  sku: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  /** null = la refacción no está dada de alta en el catálogo del tenant. */
  stockQuantity: number | null;
  suficiente: boolean;
}

export interface KitResuelto {
  id: string;
  code: string;
  kitType: string;
  name: string;
  description: string | null;
  laborMinutes: number;
  laborPrice: number;
  partsTotal: number;
  total: number;
  items: KitItemResuelto[];
  /** Verde: todo en existencia. Ámbar: falta algo. Rojo: no hay nada. */
  stock: StockLight;
  faltantes: string[];
}

/**
 * Kits de servicio.
 *
 * El valor está en resolver el kit contra el almacén del tenant en el mismo
 * momento en que el asesor lo mira: cotizar un mantenimiento sin saber si
 * hay filtros es lo que produce las promesas de entrega que no se cumplen.
 */
@Injectable()
export class ServiceKitsService {
  constructor(
    @InjectRepository(ServiceKit)
    private readonly kitRepo: Repository<ServiceKit>,
    @InjectRepository(ServiceKitItem)
    private readonly itemRepo: Repository<ServiceKitItem>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
  ) {}

  /** Familias disponibles, para el combo de "tipo de kit". */
  async tipos(tenantId: string): Promise<string[]> {
    const rows = await this.kitRepo
      .createQueryBuilder('k')
      .select('DISTINCT k.kit_type', 'tipo')
      .where('(k.tenant_id = :tenantId OR k.tenant_id IS NULL)', { tenantId })
      .andWhere('k.active = true')
      .getRawMany<{ tipo: string }>();
    return rows.map((r) => r.tipo).sort();
  }

  /**
   * Busca kits y los resuelve contra el stock de la sucursal.
   * Los de fábrica (tenant_id NULL) conviven con los del tenant.
   */
  async buscar(
    user: UserPayload,
    filtro: {
      q?: string;
      kitType?: string;
      vehicleType?: string;
      branchId?: string;
    } = {},
  ): Promise<KitResuelto[]> {
    const qb = this.kitRepo
      .createQueryBuilder('k')
      .where('(k.tenant_id = :tenantId OR k.tenant_id IS NULL)', {
        tenantId: user.tenantId,
      })
      .andWhere('k.active = true');

    if (filtro.q?.trim()) {
      qb.andWhere('(k.name ILIKE :q OR k.code ILIKE :q)', {
        q: `%${filtro.q.trim()}%`,
      });
    }
    if (filtro.kitType) {
      qb.andWhere('k.kit_type = :kitType', { kitType: filtro.kitType });
    }
    if (filtro.vehicleType) {
      // NULL en vehicle_types significa "aplica a cualquier unidad".
      qb.andWhere(
        '(k.vehicle_types IS NULL OR :vt = ANY(k.vehicle_types))',
        { vt: filtro.vehicleType },
      );
    }
    const kits = await qb.orderBy('k.name', 'ASC').getMany();
    if (!kits.length) return [];

    const items = await this.itemRepo.find({
      where: { kitId: In(kits.map((k) => k.id)) },
    });

    // Un solo golpe al catálogo para todos los SKU de todos los kits.
    const skus = [
      ...new Set(items.map((i) => i.sku).filter((s): s is string => !!s)),
    ];
    const parts = skus.length
      ? await this.partRepo.find({
          where: {
            tenantId: user.tenantId,
            sku: In(skus),
            ...(filtro.branchId ? { branchId: filtro.branchId } : {}),
          },
        })
      : [];

    return kits.map((k) => this.resolver(k, items, parts));
  }

  async obtener(user: UserPayload, id: string): Promise<KitResuelto> {
    const kit = await this.kitRepo.findOne({ where: { id } });
    if (!kit || (kit.tenantId && kit.tenantId !== user.tenantId)) {
      throw new NotFoundException('Kit no encontrado');
    }
    const items = await this.itemRepo.find({ where: { kitId: id } });
    const skus = items.map((i) => i.sku).filter((s): s is string => !!s);
    const parts = skus.length
      ? await this.partRepo.find({
          where: { tenantId: user.tenantId, sku: In(skus) },
        })
      : [];
    return this.resolver(kit, items, parts);
  }

  private resolver(
    kit: ServiceKit,
    todosLosItems: ServiceKitItem[],
    parts: Part[],
  ): KitResuelto {
    const items = todosLosItems.filter((i) => i.kitId === kit.id);
    const resueltos: KitItemResuelto[] = items.map((i) => {
      const part = i.sku ? parts.find((p) => p.sku === i.sku) : undefined;
      // Si la refacción no existe en el catálogo del tenant no podemos
      // afirmar que falte: se marca como desconocida y cuenta como faltante
      // a efectos del semáforo, que es la lectura prudente.
      const stockQuantity = part ? part.stockQuantity : null;
      // El precio del catálogo manda sobre el sugerido del kit.
      const unitPrice = part ? Number(part.publicPrice) : i.unitPrice;
      return {
        sku: i.sku,
        description: part?.name ?? i.description,
        quantity: i.quantity,
        unitPrice,
        subtotal: unitPrice * i.quantity,
        stockQuantity,
        suficiente: stockQuantity !== null && stockQuantity >= i.quantity,
      };
    });

    const partsTotal = resueltos.reduce((a, i) => a + i.subtotal, 0);
    const faltantes = resueltos
      .filter((i) => !i.suficiente)
      .map((i) => i.description);

    let stock: StockLight = 'VERDE';
    if (resueltos.length === 0) {
      // Un kit de pura mano de obra (lavado, diagnóstico) no depende del almacén.
      stock = 'VERDE';
    } else if (faltantes.length === resueltos.length) {
      stock = 'ROJO';
    } else if (faltantes.length > 0) {
      stock = 'AMBAR';
    }

    return {
      id: kit.id,
      code: kit.code,
      kitType: kit.kitType,
      name: kit.name,
      description: kit.description,
      laborMinutes: kit.laborMinutes,
      laborPrice: Number(kit.laborPrice),
      partsTotal,
      total: partsTotal + Number(kit.laborPrice),
      items: resueltos,
      stock,
      faltantes,
    };
  }

  // ─── Mantenimiento del catálogo propio del tenant ───────────

  async crear(user: UserPayload, dto: NuevoKit): Promise<ServiceKit> {
    const kit = await this.kitRepo.save(
      this.kitRepo.create({
        tenantId: user.tenantId,
        code: dto.code ?? `KIT-${Date.now()}`,
        kitType: dto.kitType ?? 'TALLER',
        name: dto.name ?? 'Kit sin nombre',
        description: dto.description ?? null,
        vehicleTypes: dto.vehicleTypes ?? null,
        laborMinutes: dto.laborMinutes ?? 0,
        laborPrice: dto.laborPrice ?? 0,
      }),
    );
    if (dto.items?.length) {
      await this.itemRepo.save(
        dto.items.map((i) =>
          this.itemRepo.create({
            kitId: kit.id,
            sku: i.sku ?? null,
            description: i.description ?? '',
            quantity: i.quantity ?? 1,
            unitPrice: i.unitPrice ?? 0,
          }),
        ),
      );
    }
    return kit;
  }

  async eliminar(user: UserPayload, id: string): Promise<void> {
    // Los kits de fábrica no se borran; se desactivan por tenant si estorban.
    const kit = await this.kitRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!kit) {
      throw new NotFoundException(
        'Kit no encontrado o es de fábrica y no se puede borrar',
      );
    }
    await this.kitRepo.delete(id);
  }

  /** Kits de fábrica, informativo para la pantalla de configuración. */
  async deFabrica(): Promise<ServiceKit[]> {
    return this.kitRepo.find({ where: { tenantId: IsNull() } });
  }
}
