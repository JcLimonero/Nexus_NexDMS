import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentPlanInstallment } from '../../unit-sales/entities/payment-plan-installment.entity';
import { PaymentPlanInstallmentStatusEnum } from '../../unit-sales/entities/payment-plan-installment.entity';
import { UnitSale } from '../../unit-sales/entities/unit-sale.entity';
import { CatalogUnit } from '../../catalog-units/entities/catalog-unit.entity';
import { PagoCreditoVencidoEvent } from '../../../events/domain-events';

@Injectable()
export class PaymentOverdueJob {
  constructor(
    @InjectRepository(PaymentPlanInstallment)
    private readonly installmentRepo: Repository<PaymentPlanInstallment>,
    @InjectRepository(UnitSale)
    private readonly unitSaleRepo: Repository<UnitSale>,
    @InjectRepository(CatalogUnit)
    private readonly catalogUnitRepo: Repository<CatalogUnit>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 10 * * *', { timeZone: 'America/Mexico_City' })
  async handleCron(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = await this.installmentRepo.find({
      where: {
        dueDate: LessThan(today),
        status: PaymentPlanInstallmentStatusEnum.PENDING,
      },
      relations: [
        'paymentPlan',
        'paymentPlan.unitSale',
        'paymentPlan.unitSale.client',
      ],
    });

    const byClient = new Map<
      string,
      {
        clientId: string;
        branchId: string;
        tenantId: string;
        client: { email?: string; phone?: string; name?: string };
        installments: Array<{
          installmentId: string;
          amount: number;
          dueDate: Date;
        }>;
      }
    >();

    for (const inst of overdue) {
      const plan = inst.paymentPlan;
      if (!plan?.unitSale) continue;

      const sale = plan.unitSale;
      const client = sale.client;
      const clientId = sale.clientId;

      const catalogUnit = await this.catalogUnitRepo.findOne({
        where: { id: sale.catalogUnitId },
      });
      const branchId = catalogUnit?.branchId ?? '';

      const key = `${sale.tenantId}:${clientId}`;
      if (!byClient.has(key)) {
        byClient.set(key, {
          clientId,
          branchId,
          tenantId: sale.tenantId,
          client: {
            email: client?.email ?? undefined,
            phone: client?.phone ?? undefined,
            name: client
              ? `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() ||
                (client.companyName ?? 'Cliente')
              : 'Cliente',
          },
          installments: [],
        });
      }

      byClient.get(key)!.installments.push({
        installmentId: inst.id,
        amount: Number(inst.amount),
        dueDate: inst.dueDate,
      });
    }

    for (const [, data] of byClient) {
      this.eventEmitter.emit(
        'pago.credito_vencido',
        new PagoCreditoVencidoEvent(
          data.clientId,
          data.branchId,
          data.tenantId,
          data.client,
          data.installments,
        ),
      );
    }
  }
}
