import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { BranchConfig } from './entities/branch-config.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UpdateBranchConfigDto } from './dto/update-branch-config.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { EncryptionService } from '../../shared/encryption/encryption.service';

const SENSITIVE_PLACEHOLDER = '••••••••';

export interface BranchConfigSafe {
  id: string;
  branchId: string;
  whatsappPhoneId: string | null;
  whatsappToken: string | null;
  facturaapiApiKey: string | null;
  bankName: string | null;
  bankClabe: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  cfdiLastFolio: number;
  updatedAt: Date;
}

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(BranchConfig)
    private readonly configRepo: Repository<BranchConfig>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async findAll(user: UserPayload): Promise<Branch[]> {
    const qb = this.branchRepo
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId: user.tenantId });

    switch (user.scope) {
      case ScopeEnum.BRANCH:
        qb.andWhere('b.id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.BRAND:
        if (!user.brandId) {
          return [];
        }
        qb.andWhere('b.brand_id = :brandId', { brandId: user.brandId });
        break;
      case ScopeEnum.GLOBAL:
        break;
    }

    return qb.orderBy('b.name', 'ASC').getMany();
  }

  async findOne(user: UserPayload, id: string): Promise<Branch> {
    await this.assertInScope(user, id);
    const branch = await this.branchRepo.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Sucursal ${id} no encontrada`);
    }
    return branch;
  }

  async create(user: UserPayload, dto: CreateBranchDto): Promise<Branch> {
    const branch = this.branchRepo.create({
      ...dto,
      tenantId: user.tenantId,
      schedule: dto.schedule ?? {},
      timezone: dto.timezone ?? 'America/Mexico_City',
      taxRate: dto.taxRate ?? 0.16,
      maxDiscountPct: dto.maxDiscountPct ?? 10,
      quotationValidityDays: dto.quotationValidityDays ?? 15,
      isPrimary: dto.isPrimary ?? false,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.branchRepo.save(branch);
    await this.configRepo.save(
      this.configRepo.create({ branchId: saved.id }),
    );
    return saved;
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateBranchDto,
  ): Promise<Branch> {
    if (
      user.role === 'MANAGER' &&
      user.scope === ScopeEnum.BRANCH
    ) {
      throw new ForbiddenException(
        'Los MANAGER con scope BRANCH no pueden editar sucursales',
      );
    }
    const branch = await this.findOne(user, id);
    Object.assign(branch, dto);
    return this.branchRepo.save(branch);
  }

  async getConfig(user: UserPayload, branchId: string): Promise<BranchConfigSafe> {
    await this.assertInScope(user, branchId);
    const config = await this.configRepo.findOne({
      where: { branchId },
    });
    if (!config) {
      throw new NotFoundException(`Configuración de sucursal ${branchId} no encontrada`);
    }
    return this.maskSensitiveConfig(config);
  }

  async updateConfig(
    user: UserPayload,
    branchId: string,
    dto: UpdateBranchConfigDto,
  ): Promise<BranchConfigSafe> {
    await this.assertInScope(user, branchId);
    const config = await this.configRepo.findOne({
      where: { branchId },
    });
    if (!config) {
      throw new NotFoundException(`Configuración de sucursal ${branchId} no encontrada`);
    }
    const updates = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );

    if (updates.whatsappToken !== undefined) {
      if (updates.whatsappToken !== SENSITIVE_PLACEHOLDER) {
        updates.whatsappToken = this.encryptionService.encrypt(updates.whatsappToken);
      } else {
        delete updates.whatsappToken;
      }
    }
    if (updates.whatsappPhoneId !== undefined) {
      if (updates.whatsappPhoneId !== SENSITIVE_PLACEHOLDER) {
        updates.whatsappPhoneId = this.encryptionService.encrypt(updates.whatsappPhoneId);
      } else {
        delete updates.whatsappPhoneId;
      }
    }
    if (updates.facturaapiApiKey !== undefined) {
      if (updates.facturaapiApiKey !== SENSITIVE_PLACEHOLDER) {
        updates.facturaapiApiKey = this.encryptionService.encrypt(updates.facturaapiApiKey);
      } else {
        delete updates.facturaapiApiKey;
      }
    }

    Object.assign(config, updates);
    const saved = await this.configRepo.save(config);
    return this.maskSensitiveConfig(saved);
  }

  private async assertInScope(user: UserPayload, branchId: string): Promise<void> {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, tenantId: user.tenantId },
    });
    if (!branch) {
      throw new NotFoundException(`Sucursal ${branchId} no encontrada`);
    }
    switch (user.scope) {
      case ScopeEnum.BRANCH:
        if (branch.id !== user.branchId) {
          throw new NotFoundException(`Sucursal ${branchId} no encontrada`);
        }
        break;
      case ScopeEnum.BRAND:
        if (user.brandId && branch.brandId !== user.brandId) {
          throw new NotFoundException(`Sucursal ${branchId} no encontrada`);
        }
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private maskSensitiveConfig(config: BranchConfig): BranchConfigSafe {
    return {
      ...config,
      whatsappPhoneId: config.whatsappPhoneId ? SENSITIVE_PLACEHOLDER : null,
      whatsappToken: config.whatsappToken ? SENSITIVE_PLACEHOLDER : null,
      facturaapiApiKey: config.facturaapiApiKey ? SENSITIVE_PLACEHOLDER : null,
    };
  }
}
