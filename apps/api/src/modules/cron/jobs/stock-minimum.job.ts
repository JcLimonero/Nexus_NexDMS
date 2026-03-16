import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Part } from '../../parts/entities/part.entity';
import { StockMinimoEvent } from '../../../events/domain-events';

@Injectable()
export class StockMinimumJob {
  constructor(
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 9 * * *', { timeZone: 'America/Mexico_City' })
  async handleCron(): Promise<void> {
    const parts = await this.partRepo.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    const byBranch = new Map<
      string,
      Array<{
        partId: string;
        name: string;
        stockActual: number;
        stockMinimo: number;
      }>
    >();

    for (const p of parts) {
      const minStock = p.minStock ?? 1;
      if (p.stockQuantity <= minStock) {
        const key = `${p.tenantId}:${p.branchId}`;
        if (!byBranch.has(key)) {
          byBranch.set(key, []);
        }
        byBranch.get(key)!.push({
          partId: p.id,
          name: p.name,
          stockActual: p.stockQuantity,
          stockMinimo: minStock,
        });
      }
    }

    for (const [key, partList] of byBranch) {
      const [tenantId, branchId] = key.split(':');
      this.eventEmitter.emit(
        'stock.minimo',
        new StockMinimoEvent(branchId, tenantId, partList),
      );
    }
  }
}
