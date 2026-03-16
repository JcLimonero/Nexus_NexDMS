import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceType } from './entities/service-type.entity';
import { ServiceTypePart } from './entities/service-type-part.entity';
import { Part } from '../parts/entities/part.entity';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto';
import { AddPartToServiceTypeDto } from './dto/add-part-to-service-type.dto';

export interface PartsAvailabilityResult {
  available: boolean;
  missingParts: Array<{
    partId: string;
    partName: string;
    required: number;
    available: number;
  }>;
}

@Injectable()
export class ServiceTypesService {
  constructor(
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepo: Repository<ServiceType>,
    @InjectRepository(ServiceTypePart)
    private readonly serviceTypePartRepo: Repository<ServiceTypePart>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
  ) {}

  async findAll(tenantId: string, branchId?: string): Promise<ServiceType[]> {
    const qb = this.serviceTypeRepo
      .createQueryBuilder('st')
      .where('st.tenant_id = :tenantId', { tenantId })
      .andWhere('st.is_active = :isActive', { isActive: true });

    if (branchId) {
      qb.andWhere('(st.branch_id = :branchId OR st.branch_id IS NULL)', {
        branchId,
      });
    }

    return qb.orderBy('st.name', 'ASC').getMany();
  }

  async findOne(id: string, tenantId: string): Promise<ServiceType> {
    const st = await this.serviceTypeRepo.findOne({
      where: { id, tenantId },
      relations: ['parts', 'parts.part'],
    });
    if (!st) {
      throw new NotFoundException('Tipo de servicio no encontrado');
    }
    return st;
  }

  async create(
    tenantId: string,
    dto: CreateServiceTypeDto,
  ): Promise<ServiceType> {
    const existing = await this.serviceTypeRepo
      .createQueryBuilder('st')
      .where('st.tenant_id = :tenantId', { tenantId })
      .andWhere('st.code = :code', { code: dto.code })
      .andWhere(
        dto.branchId ? 'st.branch_id = :branchId' : 'st.branch_id IS NULL',
        dto.branchId ? { branchId: dto.branchId } : {},
      )
      .getOne();

    if (existing) {
      throw new ConflictException(
        `Ya existe un tipo de servicio con código ${dto.code}`,
      );
    }

    const st = this.serviceTypeRepo.create({
      tenantId,
      branchId: dto.branchId ?? null,
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category,
      durationMin: dto.durationMin ?? 60,
      requiresRamp: dto.requiresRamp ?? false,
      rampDurationMin: dto.rampDurationMin ?? null,
      schedulableDays: dto.schedulableDays ?? null,
      recurrenceKmInterval: dto.recurrenceKmInterval ?? null,
      recurrenceMonthsInterval: dto.recurrenceMonthsInterval ?? null,
    });
    return this.serviceTypeRepo.save(st);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateServiceTypeDto,
  ): Promise<ServiceType> {
    const st = await this.findOne(id, tenantId);
    if (dto.code && dto.code !== st.code) {
      const existing = await this.serviceTypeRepo
        .createQueryBuilder('st')
        .where('st.tenant_id = :tenantId', { tenantId })
        .andWhere('st.code = :code', { code: dto.code })
        .andWhere('st.id != :id', { id })
        .andWhere(
          (dto.branchId ?? st.branchId)
            ? 'st.branch_id = :branchId'
            : 'st.branch_id IS NULL',
          (dto.branchId ?? st.branchId)
            ? { branchId: dto.branchId ?? st.branchId }
            : {},
        )
        .getOne();
      if (existing) {
        throw new ConflictException(
          `Ya existe un tipo de servicio con código ${dto.code}`,
        );
      }
    }
    await this.serviceTypeRepo.update(id, dto as Partial<ServiceType>);
    return this.findOne(id, tenantId);
  }

  async getRequiredParts(serviceTypeId: string): Promise<ServiceTypePart[]> {
    return this.serviceTypePartRepo.find({
      where: { serviceTypeId },
      relations: ['part'],
    });
  }

  async addPart(
    serviceTypeId: string,
    tenantId: string,
    dto: AddPartToServiceTypeDto,
  ): Promise<ServiceTypePart> {
    await this.findOne(serviceTypeId, tenantId);
    const existing = await this.serviceTypePartRepo.findOne({
      where: { serviceTypeId, partId: dto.partId },
    });
    if (existing) {
      throw new ConflictException('La parte ya está asociada a este tipo');
    }
    const stp = this.serviceTypePartRepo.create({
      serviceTypeId,
      partId: dto.partId,
      quantityRequired: dto.quantityRequired,
    });
    return this.serviceTypePartRepo.save(stp);
  }

  async removePart(
    serviceTypeId: string,
    partId: string,
    tenantId: string,
  ): Promise<void> {
    await this.findOne(serviceTypeId, tenantId);
    const stp = await this.serviceTypePartRepo.findOne({
      where: { serviceTypeId, partId },
    });
    if (!stp) {
      throw new NotFoundException('Parte no encontrada en el tipo de servicio');
    }
    await this.serviceTypePartRepo.remove(stp);
  }

  async checkPartsAvailability(
    serviceTypeId: string,
    branchId: string,
    tenantId: string,
  ): Promise<PartsAvailabilityResult> {
    const st = await this.serviceTypeRepo.findOne({
      where: { id: serviceTypeId, tenantId },
      relations: ['parts', 'parts.part'],
    });
    if (!st) {
      throw new NotFoundException('Tipo de servicio no encontrado');
    }
    if (!st.parts || st.parts.length === 0) {
      return { available: true, missingParts: [] };
    }

    const missingParts: PartsAvailabilityResult['missingParts'] = [];

    for (const stp of st.parts) {
      const part = await this.partRepo.findOne({
        where: {
          id: stp.partId,
          branchId,
          tenantId,
        },
      });
      const available = part ? part.stockQuantity : 0;
      const required = stp.quantityRequired;
      if (available < required) {
        missingParts.push({
          partId: stp.partId,
          partName: stp.part?.name ?? 'Parte',
          required,
          available,
        });
      }
    }

    return {
      available: missingParts.length === 0,
      missingParts,
    };
  }
}
