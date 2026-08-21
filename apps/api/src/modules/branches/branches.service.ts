import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type Redis from 'ioredis';
import { Branch } from './entities/branch.entity';
import { BranchConfig } from './entities/branch-config.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { FilterBranchesDto } from './dto/filter-branches.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UpdateBranchConfigDto } from './dto/update-branch-config.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import type { PaginatedResponse } from '../../common/dto/paginated-response.dto';
import { StorageService } from '../../common/storage/storage.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import { whatsappRouteCacheKey } from '../whatsapp-core/whatsapp-route-cache';

const SENSITIVE_PLACEHOLDER = '••••••••';

export interface BranchConfigSafe {
  id: string;
  branchId: string;
  whatsappPhoneNumberId: string | null;
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
    private readonly storageService: StorageService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async findAll(
    user: UserPayload,
    filters: FilterBranchesDto,
  ): Promise<PaginatedResponse<Branch>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.branchRepo
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId: user.tenantId });

    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('b.id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) {
          return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
        qb.andWhere('b.legal_entity_id = :legalEntityId', {
          legalEntityId: user.legalEntityId,
        });
        break;
      case ScopeEnum.GLOBAL:
        break;
    }

    const [data, total] = await qb
      .orderBy('b.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
    await this.configRepo.save(this.configRepo.create({ branchId: saved.id }));
    return saved;
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateBranchDto,
  ): Promise<Branch> {
    if (user.roles?.includes('MANAGER') && user.scope === ScopeEnum.SUCURSAL) {
      throw new ForbiddenException(
        'Los MANAGER con scope SUCURSAL no pueden editar sucursales',
      );
    }
    const branch = await this.findOne(user, id);
    Object.assign(branch, dto);
    return this.branchRepo.save(branch);
  }

  async getConfig(
    user: UserPayload,
    branchId: string,
  ): Promise<BranchConfigSafe> {
    await this.assertInScope(user, branchId);
    const config = await this.configRepo.findOne({
      where: { branchId },
    });
    if (!config) {
      throw new NotFoundException(
        `Configuración de sucursal ${branchId} no encontrada`,
      );
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
      throw new NotFoundException(
        `Configuración de sucursal ${branchId} no encontrada`,
      );
    }
    const updates = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );

    if (updates.whatsappToken !== undefined) {
      if (updates.whatsappToken !== SENSITIVE_PLACEHOLDER) {
        updates.whatsappToken = this.encryptionService.encrypt(
          updates.whatsappToken as string,
        );
      } else {
        delete updates.whatsappToken;
      }
    }
    // `whatsappPhoneNumberId` va sin cifrar: no es secreto y tiene que quedar
    // consultable para enrutar el webhook. Vacío es desconectar la sucursal, y
    // se guarda como NULL: el índice único deja pasar varios NULL, pero dos
    // cadenas vacías chocarían entre sí.
    if (updates.whatsappPhoneNumberId !== undefined) {
      const value = (updates.whatsappPhoneNumberId as string).trim();
      updates.whatsappPhoneNumberId = value === '' ? null : value;
    }
    if (updates.facturaapiApiKey !== undefined) {
      if (updates.facturaapiApiKey !== SENSITIVE_PLACEHOLDER) {
        updates.facturaapiApiKey = this.encryptionService.encrypt(
          updates.facturaapiApiKey as string,
        );
      } else {
        delete updates.facturaapiApiKey;
      }
    }

    // Se recuerda el anterior: si cambió, hay dos llaves de caché que tirar —
    // la del número viejo (que ya no debe resolver a esta sucursal) y la del
    // nuevo (que pudo quedar cacheada como "no configurado").
    const previousPhoneNumberId = config.whatsappPhoneNumberId;

    Object.assign(config, updates);
    const saved = await this.configRepo.save(config);

    if (previousPhoneNumberId !== saved.whatsappPhoneNumberId) {
      await this.invalidateWhatsappRoute(previousPhoneNumberId);
      await this.invalidateWhatsappRoute(saved.whatsappPhoneNumberId);
    }

    return this.maskSensitiveConfig(saved);
  }

  private async invalidateWhatsappRoute(
    phoneNumberId: string | null,
  ): Promise<void> {
    if (!phoneNumberId) return;
    try {
      await this.redis.del(whatsappRouteCacheKey(phoneNumberId));
    } catch {
      // Redis caído no debe impedir guardar la configuración; la entrada
      // expira sola.
    }
  }

  async assertBranchInScope(
    user: UserPayload,
    branchId: string,
  ): Promise<void> {
    await this.assertInScope(user, branchId);
  }

  private async assertInScope(
    user: UserPayload,
    branchId: string,
  ): Promise<void> {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, tenantId: user.tenantId },
    });
    if (!branch) {
      throw new NotFoundException(`Sucursal ${branchId} no encontrada`);
    }
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        if (branch.id !== user.branchId) {
          throw new NotFoundException(`Sucursal ${branchId} no encontrada`);
        }
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (user.legalEntityId && branch.legalEntityId !== user.legalEntityId) {
          throw new NotFoundException(`Sucursal ${branchId} no encontrada`);
        }
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  async uploadLogo(
    user: UserPayload,
    branchId: string,
    file: Express.Multer.File,
  ): Promise<Branch> {
    const branch = await this.findOne(user, branchId);
    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const key = `branches/${branchId}/logo.${ext}`;
    const buffer = (file as Express.Multer.File & { buffer?: Buffer }).buffer;
    if (!buffer) {
      throw new BadRequestException('No se pudo leer el archivo');
    }
    await this.storageService.upload(buffer, key, file.mimetype);
    branch.logoKey = key;
    return this.branchRepo.save(branch);
  }

  private maskSensitiveConfig(config: BranchConfig): BranchConfigSafe {
    return {
      ...config,
      // El id del número se devuelve completo: hay que poder verificar contra
      // Meta cuál quedó configurado. Lo que no sale nunca es el token.
      whatsappToken: config.whatsappToken ? SENSITIVE_PLACEHOLDER : null,
      facturaapiApiKey: config.facturaapiApiKey ? SENSITIVE_PLACEHOLDER : null,
    };
  }
}
