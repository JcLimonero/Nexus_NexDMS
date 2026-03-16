import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitSaleExtra } from './entities/unit-sale-extra.entity';
import { CreateUnitSaleExtraDto } from './dto/create-unit-sale-extra.dto';
import { UpdateUnitSaleExtraDto } from './dto/update-unit-sale-extra.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { UnitSaleStatusEnum } from '../unit-sales/entities/unit-sale.entity';

@Injectable()
export class UnitSaleExtrasService {
  constructor(
    @InjectRepository(UnitSaleExtra)
    private readonly extraRepo: Repository<UnitSaleExtra>,
  ) {}

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo SELLER, MANAGER y ADMIN pueden gestionar trámites extras',
      );
    }
  }

  async findAllForSale(unitSaleId: string): Promise<UnitSaleExtra[]> {
    return this.extraRepo.find({
      where: { unitSaleId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<UnitSaleExtra> {
    const extra = await this.extraRepo.findOne({ where: { id } });
    if (!extra) {
      throw new NotFoundException(`Trámite extra ${id} no encontrado`);
    }
    return extra;
  }

  async create(
    user: UserPayload,
    unitSaleId: string,
    saleStatus: UnitSaleStatusEnum,
    dto: CreateUnitSaleExtraDto,
  ): Promise<UnitSaleExtra> {
    this.assertCanWrite(user);
    if (saleStatus !== UnitSaleStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        'Solo se pueden agregar extras a ventas en proceso',
      );
    }
    const extra = this.extraRepo.create({
      unitSaleId,
      type: dto.type,
      providerName: dto.providerName ?? null,
      providerReference: dto.providerReference ?? null,
      cost: dto.cost,
      notes: dto.notes ?? null,
      extraData: dto.extraData ?? null,
    });
    return this.extraRepo.save(extra);
  }

  async update(
    user: UserPayload,
    id: string,
    saleStatus: UnitSaleStatusEnum,
    dto: UpdateUnitSaleExtraDto,
  ): Promise<UnitSaleExtra> {
    this.assertCanWrite(user);
    await this.findOne(id);
    if (saleStatus !== UnitSaleStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        'Solo se pueden editar extras de ventas en proceso',
      );
    }
    const updateData: Record<string, unknown> = {};
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.providerName !== undefined)
      updateData.providerName = dto.providerName;
    if (dto.providerReference !== undefined)
      updateData.providerReference = dto.providerReference;
    if (dto.cost !== undefined) updateData.cost = dto.cost;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.extraData !== undefined) updateData.extraData = dto.extraData;
    await this.extraRepo.update(id, updateData as never);
    return this.findOne(id);
  }

  async delete(
    user: UserPayload,
    id: string,
    saleStatus: UnitSaleStatusEnum,
  ): Promise<void> {
    this.assertCanWrite(user);
    await this.findOne(id);
    if (saleStatus !== UnitSaleStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        'Solo se pueden eliminar extras de ventas en proceso',
      );
    }
    await this.extraRepo.delete(id);
  }
}
