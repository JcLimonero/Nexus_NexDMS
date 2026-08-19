import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitReturn } from './entities/unit-return.entity';
import { CreateUnitReturnDto } from './dto/create-unit-return.dto';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import {
  CatalogUnitConditionEnum,
  CatalogUnitStatusEnum,
} from '../catalog-units/entities/catalog-unit.entity';
import { BranchesService } from '../branches/branches.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class UnitReturnsService {
  constructor(
    @InjectRepository(UnitReturn)
    private readonly returnRepo: Repository<UnitReturn>,
    @InjectRepository(CatalogUnit)
    private readonly catalogUnitRepo: Repository<CatalogUnit>,
    private readonly branchesService: BranchesService,
  ) {}

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'No tiene permisos para registrar recompras de unidades',
      );
    }
  }

  async create(
    user: UserPayload,
    dto: CreateUnitReturnDto,
  ): Promise<UnitReturn> {
    this.assertCanWrite(user);

    const unit = await this.catalogUnitRepo.findOne({
      where: { id: dto.catalogUnitId, tenantId: user.tenantId },
    });
    if (!unit) {
      throw new NotFoundException('Unidad no encontrada');
    }
    const isSold = unit.status === CatalogUnitStatusEnum.SOLD;
    const isPendingExpediente = unit.status === CatalogUnitStatusEnum.PENDING_EXPEDIENTE;
    if (!isSold && !isPendingExpediente) {
      throw new BadRequestException(
        'Solo se puede registrar recompra de unidades vendidas o seminuevas con expediente pendiente',
      );
    }
    if (isPendingExpediente) {
      const existing = await this.returnRepo.findOne({
        where: { catalogUnitId: dto.catalogUnitId },
      });
      if (existing) {
        throw new BadRequestException(
          'Esta unidad ya tiene un vendedor registrado. Use el expediente para subir documentos.',
        );
      }
    }

    await this.branchesService.assertBranchInScope(user, unit.branchId);

    const unitReturn = this.returnRepo.create({
      tenantId: user.tenantId,
      catalogUnitId: dto.catalogUnitId,
      clientId: dto.clientId,
      unitSaleId: dto.unitSaleId ?? null,
      returnDate: new Date(dto.returnDate),
      buybackPrice: dto.buybackPrice,
      mileage: dto.mileage ?? null,
      notes: dto.notes ?? null,
    });

    const saved = await this.returnRepo.save(unitReturn);

    if (isSold) {
      unit.status = CatalogUnitStatusEnum.PENDING_EXPEDIENTE;
      unit.conditionType = CatalogUnitConditionEnum.USED;
      await this.catalogUnitRepo.save(unit);
    }

    return saved;
  }

  async findAllByCatalogUnit(
    user: UserPayload,
    catalogUnitId: string,
  ): Promise<UnitReturn[]> {
    const unit = await this.catalogUnitRepo.findOne({
      where: { id: catalogUnitId, tenantId: user.tenantId },
    });
    if (!unit) {
      throw new NotFoundException('Unidad no encontrada');
    }
    await this.branchesService.assertBranchInScope(user, unit.branchId);

    return this.returnRepo.find({
      where: { catalogUnitId },
      relations: ['client'],
      order: { returnDate: 'DESC' },
    });
  }
}
