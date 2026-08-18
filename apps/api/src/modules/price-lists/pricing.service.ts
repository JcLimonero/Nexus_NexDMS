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
    let activeList: PriceList | null = null;
    const itemsMap = new Map<string, number>();

    if (clientId) {
      const client = await this.clientRepo.findOne({
        where: { id: clientId, tenantId },
      });
      if (client) {
        fixedDiscount = Number(client.fixedDiscount) || 0;
        if (client.priceListId) {
          const pl = await this.plRepo.findOne({
            where: { id: client.priceListId, tenantId },
          });
          if (pl && pl.isActive && this.vigente(pl)) {
            activeList = pl;
            const items = await this.pliRepo.find({
              where: { priceListId: pl.id },
            });
            for (const it of items) itemsMap.set(it.partId, Number(it.price));
          }
        }
      }
    }

    return (part: Part): number => {
      if (activeList) {
        const override = itemsMap.get(part.id);
        if (override !== undefined) return override;
        const disc = Number(activeList.discountPct) || 0;
        return this.round2(Number(part.publicPrice) * (1 - disc / 100));
      }
      const base = this.basePrice(part, fallbackTier);
      return fixedDiscount > 0
        ? this.round2(base * (1 - fixedDiscount / 100))
        : base;
    };
  }
}
