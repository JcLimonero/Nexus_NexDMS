import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import {
  Payable,
  PayablePayment,
  Receivable,
  ReceivablePayment,
} from './entities/finance.entities';

type Kind = 'receivable' | 'payable';

interface CreateDocDto {
  branchId?: string;
  clientId?: string; // CxC
  supplierId?: string; // CxP
  beneficiaryName?: string; // CxP particular
  referenceType?: string;
  referenceId?: string;
  concept: string;
  total: number;
  dueDate?: string;
}

/** Buckets de antigüedad de saldos en días. */
const AGING_BUCKETS = [
  { key: 'current', label: 'Al corriente', from: -Infinity, to: 0 },
  { key: 'd1_30', label: '1-30 días', from: 1, to: 30 },
  { key: 'd31_60', label: '31-60 días', from: 31, to: 60 },
  { key: 'd61_90', label: '61-90 días', from: 61, to: 90 },
  { key: 'd90_plus', label: '90+ días', from: 91, to: Infinity },
];

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Receivable)
    private readonly recvRepo: Repository<Receivable>,
    @InjectRepository(ReceivablePayment)
    private readonly recvPayRepo: Repository<ReceivablePayment>,
    @InjectRepository(Payable)
    private readonly payRepo: Repository<Payable>,
    @InjectRepository(PayablePayment)
    private readonly payPayRepo: Repository<PayablePayment>,
  ) {}

  private repo(kind: Kind): Repository<Receivable> | Repository<Payable> {
    return kind === 'receivable' ? this.recvRepo : this.payRepo;
  }

  async list(user: UserPayload, kind: Kind, status?: string) {
    const qb = (this.repo(kind) as Repository<Receivable>)
      .createQueryBuilder('d')
      .where('d.tenant_id = :t', { t: user.tenantId })
      // Propiedad de entidad (no columna SQL): con take() TypeORM resuelve
      // el orderBy vía metadata y truena con snake_case.
      .orderBy('d.createdAt', 'DESC')
      .take(200);
    if (kind === 'receivable') qb.leftJoinAndSelect('d.client', 'client');
    else qb.leftJoinAndSelect('d.supplier', 'supplier');
    if (status) qb.andWhere('d.status = :s', { s: status });
    return qb.getMany();
  }

  async create(user: UserPayload, kind: Kind, dto: CreateDocDto) {
    if (dto.total <= 0) {
      throw new BadRequestException('El total debe ser mayor a 0');
    }
    const repo = this.repo(kind) as Repository<Receivable & Payable>;
    const doc = repo.create({
      tenantId: user.tenantId,
      branchId: dto.branchId ?? null,
      clientId: kind === 'receivable' ? (dto.clientId ?? null) : undefined,
      supplierId: kind === 'payable' ? (dto.supplierId ?? null) : undefined,
      beneficiaryName:
        kind === 'payable' ? (dto.beneficiaryName ?? null) : undefined,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      concept: dto.concept,
      total: String(dto.total),
      dueDate: dto.dueDate ?? null,
      status: 'OPEN',
    } as never);
    return repo.save(doc);
  }

  async registerPayment(
    user: UserPayload,
    kind: Kind,
    id: string,
    dto: { amount: number; method?: string; notes?: string },
  ) {
    const repo = this.repo(kind) as Repository<Receivable>;
    const doc = await repo.findOne({ where: { id, tenantId: user.tenantId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    if (doc.status === 'PAID' || doc.status === 'CANCELLED') {
      throw new BadRequestException(`Documento ${doc.status}, no acepta pagos`);
    }
    const balance = Number(doc.total) - Number(doc.paidAmount);
    if (dto.amount <= 0 || dto.amount > balance + 0.001) {
      throw new BadRequestException(
        `El pago debe ser entre 0 y el saldo (${balance.toFixed(2)})`,
      );
    }
    if (kind === 'receivable') {
      await this.recvPayRepo.save(
        this.recvPayRepo.create({
          receivableId: id,
          amount: String(dto.amount),
          method: dto.method ?? 'CASH',
          notes: dto.notes ?? null,
        }),
      );
    } else {
      await this.payPayRepo.save(
        this.payPayRepo.create({
          payableId: id,
          amount: String(dto.amount),
          method: dto.method ?? 'CASH',
          notes: dto.notes ?? null,
        }),
      );
    }
    const newPaid = Number(doc.paidAmount) + dto.amount;
    doc.paidAmount = String(newPaid);
    doc.status = newPaid >= Number(doc.total) - 0.001 ? 'PAID' : 'PARTIAL';
    return repo.save(doc);
  }

  async cancel(user: UserPayload, kind: Kind, id: string) {
    const repo = this.repo(kind) as Repository<Receivable>;
    const doc = await repo.findOne({ where: { id, tenantId: user.tenantId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    if (Number(doc.paidAmount) > 0) {
      throw new BadRequestException('No se puede cancelar con pagos aplicados');
    }
    doc.status = 'CANCELLED';
    return repo.save(doc);
  }

  /** Antigüedad de saldos abiertos por bucket. */
  async aging(user: UserPayload, kind: Kind) {
    const docs = await (this.repo(kind) as Repository<Receivable>)
      .createQueryBuilder('d')
      .where('d.tenant_id = :t', { t: user.tenantId })
      .andWhere("d.status IN ('OPEN', 'PARTIAL')")
      .getMany();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = AGING_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      count: 0,
      amount: 0,
    }));
    let totalOpen = 0;

    for (const d of docs) {
      const balance = Number(d.total) - Number(d.paidAmount);
      totalOpen += balance;
      let daysOverdue = 0;
      if (d.dueDate) {
        const due = new Date(`${d.dueDate}T00:00:00`);
        daysOverdue = Math.floor(
          (today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000),
        );
      }
      const bucket =
        buckets[
          AGING_BUCKETS.findIndex(
            (b) => daysOverdue >= b.from && daysOverdue <= b.to,
          )
        ] ?? buckets[0];
      bucket.count += 1;
      bucket.amount += balance;
    }

    return { totalOpen, buckets };
  }
}
