import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import {
  BranchPrinter,
  BranchPrinterUsageEnum,
} from './entities/branch-printer.entity';
import { Branch } from '../branches/entities/branch.entity';
import { CreateBranchPrinterDto } from './dto/create-branch-printer.dto';
import { UpdateBranchPrinterDto } from './dto/update-branch-printer.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { BranchesService } from '../branches/branches.service';

@Injectable()
export class BranchPrintersService {
  constructor(
    @InjectRepository(BranchPrinter)
    private readonly printerRepo: Repository<BranchPrinter>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly branchesService: BranchesService,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<BranchPrinter>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('bp.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = bp.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  async create(
    user: UserPayload,
    dto: CreateBranchPrinterDto,
  ): Promise<BranchPrinter> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo ADMIN o MANAGER pueden configurar impresoras',
      );
    }

    await this.branchesService.assertBranchInScope(user, dto.branchId);

    if (dto.isDefault) {
      const existing = await this.printerRepo.findOne({
        where: {
          branchId: dto.branchId,
          usage: dto.usage,
          isDefault: true,
        },
      });
      if (existing) {
        await this.printerRepo.update(existing.id, { isDefault: false });
      }
    }

    const printer = this.printerRepo.create({
      tenantId: user.tenantId,
      branchId: dto.branchId,
      name: dto.name,
      type: dto.type,
      usage: dto.usage,
      isDefault: dto.isDefault ?? false,
      isActive: dto.isActive ?? true,
    });
    return this.printerRepo.save(printer);
  }

  async findAll(
    user: UserPayload,
    branchId?: string,
  ): Promise<BranchPrinter[]> {
    const qb = this.printerRepo
      .createQueryBuilder('bp')
      .leftJoinAndSelect('bp.branch', 'branch')
      .where('bp.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (branchId) {
      qb.andWhere('bp.branch_id = :branchId', { branchId });
    }
    return qb.orderBy('bp.name', 'ASC').getMany();
  }

  async findOne(user: UserPayload, id: string): Promise<BranchPrinter> {
    const printer = await this.printerRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['branch'],
    });
    if (!printer) {
      throw new NotFoundException(`Impresora ${id} no encontrada`);
    }
    const qb = this.printerRepo
      .createQueryBuilder('bp')
      .where('bp.id = :id', { id })
      .andWhere('bp.tenant_id = :tenantId', { tenantId: user.tenantId });
    this.applyScope(qb, user);
    const found = await qb.getOne();
    if (!found) {
      throw new NotFoundException(`Impresora ${id} no encontrada`);
    }
    return printer;
  }

  async findDefaultByBranchAndUsage(
    branchId: string,
    usage: string,
  ): Promise<BranchPrinter | null> {
    return this.printerRepo.findOne({
      where: {
        branchId,
        usage: usage as BranchPrinterUsageEnum,
        isDefault: true,
        isActive: true,
      },
    });
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateBranchPrinterDto,
  ): Promise<BranchPrinter> {
    const printer = await this.findOne(user, id);
    if (dto.isDefault) {
      const existing = await this.printerRepo.findOne({
        where: {
          branchId: printer.branchId,
          usage: printer.usage,
          isDefault: true,
          id: Not(id),
        },
      });
      if (existing) {
        await this.printerRepo.update(existing.id, { isDefault: false });
      }
    }
    await this.printerRepo.update(id, dto as Partial<BranchPrinter>);
    return this.findOne(user, id);
  }

  async remove(user: UserPayload, id: string): Promise<void> {
    await this.findOne(user, id);
    await this.printerRepo.delete(id);
  }
}
