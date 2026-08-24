import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceList } from './entities/price-list.entity';
import { PriceListItem } from './entities/price-list-item.entity';
import { Client } from '../clients/entities/client.entity';
import { Part } from '../parts/entities/part.entity';

/** Los tres precios base que viven en la propia parte. */
export enum BasePriceTier {
  PUBLIC = 'PUBLIC',
  WHOLESALE = 'WHOLESALE',
  BUSINESS = 'BUSINESS',
}

/** Resuelve el precio de una parte para un cliente concreto. */
export type PartPriceResolver = (part: Part) => number;

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PriceList)
    private readonly plRepo: Repository<PriceList>,
    @InjectRepository(PriceListItem)
    private readonly pliRepo: Repository<PriceListItem>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /** Precio base por nivel, tomado de las columnas de la parte. */
  private basePrice(part: Part, tier: BasePriceTier): number {
    switch (tier) {
      case BasePriceTier.WHOLESALE:
        return Number(part.wholesalePrice);
      case BasePriceTier.BUSINESS:
        return Number(part.businessPrice);
      case BasePriceTier.PUBLIC:
      default:
        return Number(part.publicPrice);
    }
  }

  /** Hoy (medianoche local) cae dentro de la vigencia de la lista. */
  private vigente(pl: PriceList): boolean {
    const hoy = new Date().toISOString().slice(0, 10);
    if (pl.validFrom && hoy < pl.validFrom) return false;
    if (pl.validTo && hoy > pl.validTo) return false;
    return true;
  }

  /**
   * Construye un resolvedor de precios para el cliente dado. Si el cliente
   * tiene una lista asignada y vigente, sus precios salen de ahí (item
   * específico o descuento global de la lista sobre el precio público). Si no,
   * cae al precio por nivel y aplica el descuento fijo del cliente.
   */
  async forClient(
    tenantId: string,
    clientId: string | null | undefined,
    fallbackTier: BasePriceTier,
  ): Promise<PartPriceResolver> {
    let fixedDiscount = 0;
    let priceListId: string | null = null;
    if (clientId) {
      const client = await this.clientRepo.findOne({
        where: { id: clientId, tenantId },
      });
      if (client) {
        fixedDiscount = Number(client.fixedDiscount) || 0;
        priceListId = client.priceListId ?? null;
      }
    }
    return this.buildResolver(tenantId, {
      priceListId,
      discountPct: fixedDiscount,
      fallbackTier,
    });
  }

  /**
   * Resolvedor de precios a partir de una lista y/o un descuento explícitos.
   * Base común de precios preferenciales: la usan tanto el descuento del
   * cliente como el convenio de flotilla, para que ambos calculen igual.
   *
   * Con lista vigente manda la lista (override por pieza o su % sobre el
   * público). Sin lista, precio por nivel menos el descuento indicado.
   */
  async buildResolver(
    tenantId: string,
    opts: {
      priceListId: string | null;
      discountPct: number;
      fallbackTier: BasePriceTier;
    },
  ): Promise<PartPriceResolver> {
    let activeList: PriceList | null = null;
    const itemsMap = new Map<string, number>();
    if (opts.priceListId) {
      const pl = await this.plRepo.findOne({
        where: { id: opts.priceListId, tenantId },
      });
      if (pl && pl.isActive && this.vigente(pl)) {
        activeList = pl;
        const items = await this.pliRepo.find({
          where: { priceListId: pl.id },
        });
        for (const it of items) itemsMap.set(it.partId, Number(it.price));
      }
    }
    const discount = Number(opts.discountPct) || 0;

    return (part: Part): number => {
      if (activeList) {
        const override = itemsMap.get(part.id);
        if (override !== undefined) return override;
        const disc = Number(activeList.discountPct) || 0;
        return this.round2(Number(part.publicPrice) * (1 - disc / 100));
      }
      const base = this.basePrice(part, opts.fallbackTier);
      return discount > 0 ? this.round2(base * (1 - discount / 100)) : base;
    };
  }
}
