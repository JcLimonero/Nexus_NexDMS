import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CatalogUnit,
  CatalogUnitConditionEnum,
  CatalogUnitStatusEnum,
} from './entities/catalog-unit.entity';
import { Branch } from '../branches/entities/branch.entity';
import { UnitLocation } from '../unit-locations/entities/unit-location.entity';
import { UnitSale } from '../unit-sales/entities/unit-sale.entity';
import { UnitReturn } from '../unit-returns/entities/unit-return.entity';
import { UnitReturnDocument } from '../unit-return-documents/entities/unit-return-document.entity';
import { UnitReturnDocumentStatusEnum } from '../unit-return-documents/entities/unit-return-document.entity';
import { REQUIRED_EXPEDIENTE_DOCUMENT_TYPES } from '../unit-return-documents/constants/document-types';
import { UnitSaleStatusEnum } from '../unit-sales/entities/unit-sale.entity';
import { CreateCatalogUnitDto } from './dto/create-catalog-unit.dto';
import { UpdateCatalogUnitDto } from './dto/update-catalog-unit.dto';
import {
  FilterCatalogUnitsDto,
  SearchScopeType,
} from './dto/filter-catalog-units.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { BranchesService } from '../branches/branches.service';
import { GlobalModel } from '../global-models/entities/global-model.entity';
import { VehicleColor } from '../vehicle-colors/entities/vehicle-color.entity';

@Injectable()
export class CatalogUnitsService {
  constructor(
    @InjectRepository(CatalogUnit)
    private readonly unitRepo: Repository<CatalogUnit>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(UnitLocation)
    private readonly locationRepo: Repository<UnitLocation>,
    @InjectRepository(UnitSale)
    private readonly saleRepo: Repository<UnitSale>,
    @InjectRepository(UnitReturn)
    private readonly returnRepo: Repository<UnitReturn>,
    @InjectRepository(UnitReturnDocument)
    private readonly unitReturnDocRepo: Repository<UnitReturnDocument>,
    @InjectRepository(GlobalModel)
    private readonly globalModelRepo: Repository<GlobalModel>,
    @InjectRepository(VehicleColor)
    private readonly vehicleColorRepo: Repository<VehicleColor>,
    private readonly branchesService: BranchesService,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<CatalogUnit>['createQueryBuilder']>,
    user: UserPayload,
    searchScope?: SearchScopeType,
  ) {
    const useGroup = searchScope === 'group';
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        if (useGroup && user.legalEntityId) {
          qb.innerJoin('branches', 'b', 'b.id = cu.branch_id').andWhere(
            'b.legal_entity_id = :legalEntityId',
            { legalEntityId: user.legalEntityId },
          );
        } else {
          qb.andWhere('cu.branch_id = :branchId', { branchId: user.branchId });
        }
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        if (useGroup) {
          qb.innerJoin('branches', 'b', 'b.id = cu.branch_id').andWhere(
            'b.legal_entity_id = :legalEntityId',
            { legalEntityId: user.legalEntityId },
          );
        } else {
          qb.andWhere('cu.branch_id = :branchId', { branchId: user.branchId });
        }
        break;
      case ScopeEnum.GLOBAL:
        if (useGroup && user.legalEntityId) {
          qb.innerJoin('branches', 'b', 'b.id = cu.branch_id').andWhere(
            'b.legal_entity_id = :legalEntityId',
            { legalEntityId: user.legalEntityId },
          );
        } else {
          qb.andWhere('cu.branch_id = :branchId', { branchId: user.branchId });
        }
        break;
    }
  }

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo WAREHOUSE, SELLER, MANAGER y ADMIN pueden gestionar catálogo de unidades',
      );
    }
  }

  async findAll(
    user: UserPayload,
    filters: FilterCatalogUnitsDto,
  ): Promise<{
    data: CatalogUnit[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    const qb = this.unitRepo
      .createQueryBuilder('cu')
      .where('cu.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('cu.deleted_at IS NULL');

    if (filters.branchId) {
      await this.branchesService.assertBranchInScope(user, filters.branchId);
      qb.andWhere('cu.branch_id = :branchId', { branchId: filters.branchId });
    } else if (filters.searchScope === 'group') {
      this.applyScope(qb, user, 'group');
    } else {
      this.applyScope(qb, user, 'local');
    }
    if (filters.brand?.trim()) {
      qb.andWhere('cu.brand ILIKE :brand', {
        brand: `%${filters.brand.trim()}%`,
      });
    }
    if (filters.status) {
      qb.andWhere('cu.status = :status', { status: filters.status });
    }
    if (filters.vehicleType) {
      qb.andWhere('cu.vehicle_type = :vehicleType', {
        vehicleType: filters.vehicleType,
      });
    }
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        '(cu.serial_number ILIKE :term OR cu.model ILIKE :term OR cu.brand ILIKE :term OR cu.color ILIKE :term)',
        { term },
      );
    }

    const [data, total] = await qb
      .orderBy('cu.created_at', 'DESC')
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

  async findOne(user: UserPayload, id: string): Promise<CatalogUnit> {
    const qb = this.unitRepo
      .createQueryBuilder('cu')
      .where('cu.id = :id', { id })
      .andWhere('cu.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('cu.deleted_at IS NULL');

    this.applyScope(qb, user);

    const unit = await qb.getOne();
    if (!unit) {
      throw new NotFoundException(`Unidad ${id} no encontrada`);
    }
    return unit;
  }

  async findBySerialNumber(
    user: UserPayload,
    serialNumber: string,
    branchId?: string,
  ): Promise<CatalogUnit> {
    if (!serialNumber?.trim()) {
      throw new BadRequestException('serialNumber es requerido');
    }
    const qb = this.unitRepo
      .createQueryBuilder('cu')
      .where('cu.serial_number = :serialNumber', {
        serialNumber: serialNumber.trim(),
      })
      .andWhere('cu.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('cu.deleted_at IS NULL');

    this.applyScope(qb, user);
    if (branchId) {
      qb.andWhere('cu.branch_id = :branchId', { branchId });
    }

    const unit = await qb.getOne();
    if (!unit) {
      throw new NotFoundException(
        `Unidad con número de serie ${serialNumber} no encontrada`,
      );
    }
    return unit;
  }

  async create(
    user: UserPayload,
    dto: CreateCatalogUnitDto,
  ): Promise<CatalogUnit> {
    this.assertCanWrite(user);

    await this.branchesService.assertBranchInScope(user, dto.branchId);

    const globalModel = await this.globalModelRepo.findOne({
      where: { id: dto.globalModelId },
      relations: { brand: true },
    });
    if (!globalModel) {
      throw new BadRequestException(
        'El modelo seleccionado no existe en el catálogo. Debe seleccionar un tipo válido.',
      );
    }

    const exteriorColor = await this.vehicleColorRepo.findOne({
      where: { id: dto.exteriorColorId },
    });
    if (!exteriorColor) {
      throw new BadRequestException(
        'El color exterior seleccionado no existe en el catálogo. Debe seleccionar un color válido.',
      );
    }

    let interiorColorName: string | null = null;
    if (dto.interiorColorId) {
      const interiorColor = await this.vehicleColorRepo.findOne({
        where: { id: dto.interiorColorId },
      });
      if (!interiorColor) {
        throw new BadRequestException(
          'El color interior seleccionado no existe en el catálogo.',
        );
      }
      interiorColorName = interiorColor.name;
    }

    const existing = await this.unitRepo.findOne({
      where: { serialNumber: dto.serialNumber },
    });
    if (existing) {
      throw new BadRequestException(
        `Ya existe una unidad con número de serie ${dto.serialNumber}`,
      );
    }

    if (dto.locationId) {
      const location = await this.locationRepo.findOne({
        where: { id: dto.locationId, branchId: dto.branchId },
      });
      if (!location) {
        throw new NotFoundException(
          'Ubicación no encontrada o no pertenece a la sucursal',
        );
      }
    }

    const brandName = globalModel.brand?.name ?? '';
    const isSeminueva =
      dto.conditionType === CatalogUnitConditionEnum.USED;
    const unit = this.unitRepo.create({
      ...dto,
      tenantId: user.tenantId,
      branchId: dto.branchId,
      globalModelId: dto.globalModelId,
      vehicleType: dto.vehicleType,
      brand: brandName,
      model: globalModel.model,
      version: globalModel.version,
      year: globalModel.year,
      color: exteriorColor.name,
      interiorColor: interiorColorName,
      exteriorColorId: dto.exteriorColorId,
      interiorColorId: dto.interiorColorId ?? null,
      serialNumber: dto.serialNumber,
      engineNumber: dto.engineNumber ?? null,
      displacement: dto.displacement ?? null,
      doorCount: dto.doorCount ?? null,
      costPrice: dto.costPrice,
      listPrice: dto.listPrice,
      salePrice: dto.salePrice,
      status: isSeminueva
        ? CatalogUnitStatusEnum.PENDING_EXPEDIENTE
        : CatalogUnitStatusEnum.AVAILABLE,
      conditionType: dto.conditionType ?? CatalogUnitConditionEnum.NEW,
      locationId: dto.locationId ?? null,
      imageKey: dto.imageKey ?? null,
      imagesKeys: null,
      notes: dto.notes ?? null,
      acquisitionDate: dto.acquisitionDate
        ? new Date(dto.acquisitionDate)
        : null,
    });
    return this.unitRepo.save(unit);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateCatalogUnitDto,
  ): Promise<CatalogUnit> {
    this.assertCanWrite(user);
    const unit = await this.findOne(user, id);

    if (unit.status === CatalogUnitStatusEnum.SOLD) {
      throw new ForbiddenException('No se puede modificar una unidad vendida');
    }

    if (dto.serialNumber && dto.serialNumber !== unit.serialNumber) {
      const existing = await this.unitRepo.findOne({
        where: { serialNumber: dto.serialNumber },
      });
      if (existing) {
        throw new BadRequestException(
          `Ya existe una unidad con número de serie ${dto.serialNumber}`,
        );
      }
    }

    if (dto.locationId) {
      const location = await this.locationRepo.findOne({
        where: { id: dto.locationId, branchId: unit.branchId },
      });
      if (!location) {
        throw new NotFoundException('Ubicación no encontrada');
      }
    }

    const derived: Partial<CatalogUnit> = {};
    if (dto.globalModelId) {
      const globalModel = await this.globalModelRepo.findOne({
        where: { id: dto.globalModelId },
        relations: { brand: true },
      });
      if (!globalModel) {
        throw new BadRequestException(
          'El modelo seleccionado no existe en el catálogo.',
        );
      }
      derived.globalModelId = dto.globalModelId;
      derived.brand = globalModel.brand?.name ?? unit.brand;
      derived.model = globalModel.model;
      derived.version = globalModel.version;
      derived.year = globalModel.year;
    }

    if (dto.exteriorColorId) {
      const exteriorColor = await this.vehicleColorRepo.findOne({
        where: { id: dto.exteriorColorId },
      });
      if (!exteriorColor) {
        throw new BadRequestException(
          'El color exterior seleccionado no existe en el catálogo.',
        );
      }
      derived.exteriorColorId = dto.exteriorColorId;
      derived.color = exteriorColor.name;
    }

    if (dto.interiorColorId !== undefined) {
      if (dto.interiorColorId) {
        const interiorColor = await this.vehicleColorRepo.findOne({
          where: { id: dto.interiorColorId },
        });
        if (!interiorColor) {
          throw new BadRequestException(
            'El color interior seleccionado no existe en el catálogo.',
          );
        }
        derived.interiorColorId = dto.interiorColorId;
        derived.interiorColor = interiorColor.name;
      } else {
        derived.interiorColorId = null;
        derived.interiorColor = null;
      }
    }

    Object.assign(unit, dto, derived);
    if (dto.acquisitionDate !== undefined) {
      unit.acquisitionDate = dto.acquisitionDate
        ? new Date(dto.acquisitionDate)
        : null;
    }
    return this.unitRepo.save(unit);
  }

  async getHistory(
    user: UserPayload,
    id: string,
  ): Promise<
    Array<{
      type: 'ACQUISITION' | 'SALE' | 'RETURN';
      date: string;
      id?: string;
      clientId?: string;
      clientName?: string;
      finalPrice?: number;
      buybackPrice?: number;
      deliveryDate?: string;
      folio?: string;
      mileage?: number;
    }>
  > {
    const unit = await this.findOne(user, id);
    const events: Array<{
      type: 'ACQUISITION' | 'SALE' | 'RETURN';
      date: string;
      id?: string;
      clientId?: string;
      clientName?: string;
      finalPrice?: number;
      buybackPrice?: number;
      deliveryDate?: string;
      folio?: string;
      mileage?: number;
    }> = [];

    if (unit.acquisitionDate) {
      events.push({
        type: 'ACQUISITION',
        date: unit.acquisitionDate.toString(),
      });
    } else if (unit.createdAt) {
      events.push({
        type: 'ACQUISITION',
        date: new Date(unit.createdAt).toISOString().split('T')[0],
      });
    }

    const sales = await this.saleRepo.find({
      where: { catalogUnitId: id, status: UnitSaleStatusEnum.COMPLETED },
      relations: ['client'],
      order: { createdAt: 'ASC' },
    });
    for (const s of sales) {
      const clientName =
        s.client?.companyName?.trim() ||
        [s.client?.firstName, s.client?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        'Cliente';
      events.push({
        type: 'SALE',
        date: new Date(s.createdAt).toISOString().split('T')[0],
        id: s.id,
        clientId: s.clientId,
        clientName,
        finalPrice: Number(s.finalPrice),
        deliveryDate: s.deliveryDate
          ? new Date(s.deliveryDate).toISOString().split('T')[0]
          : undefined,
        folio: s.folio,
      });
    }

    const returns = await this.returnRepo.find({
      where: { catalogUnitId: id },
      relations: ['client'],
      order: { returnDate: 'ASC' },
    });
    for (const r of returns) {
      const clientName =
        r.client?.companyName?.trim() ||
        [r.client?.firstName, r.client?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        'Cliente';
      events.push({
        type: 'RETURN',
        date: new Date(r.returnDate).toISOString().split('T')[0],
        id: r.id,
        clientId: r.clientId,
        clientName,
        buybackPrice: Number(r.buybackPrice),
        mileage: r.mileage ?? undefined,
      });
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    return events;
  }

  async getExpedienteStatus(
    user: UserPayload,
    id: string,
  ): Promise<{
    complete: boolean;
    hasSeller: boolean;
    missingDocs: string[];
    lastReturn: { id: string; clientName: string; returnDate: string } | null;
    canBecomeAvailable: boolean;
  }> {
    const unit = await this.findOne(user, id);

    const lastReturn = await this.returnRepo.findOne({
      where: { catalogUnitId: id },
      relations: ['client'],
      order: { returnDate: 'DESC' },
    });

    if (!lastReturn) {
      return {
        complete: false,
        hasSeller: false,
        missingDocs: [...REQUIRED_EXPEDIENTE_DOCUMENT_TYPES],
        lastReturn: null,
        canBecomeAvailable: false,
      };
    }

    const clientName =
      lastReturn.client?.companyName?.trim() ||
      [lastReturn.client?.firstName, lastReturn.client?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      'Vendedor';

    const docs = await this.unitReturnDocRepo.find({
      where: {
        unitReturnId: lastReturn.id,
        status: UnitReturnDocumentStatusEnum.APPROVED,
      },
    });

    const approvedTypes = new Set(docs.map((d) => d.documentType));
    const missingDocs = REQUIRED_EXPEDIENTE_DOCUMENT_TYPES.filter(
      (t) => !approvedTypes.has(t),
    );

    const complete =
      lastReturn.clientId != null && missingDocs.length === 0;
    const canBecomeAvailable =
      unit.status === CatalogUnitStatusEnum.PENDING_EXPEDIENTE && complete;

    return {
      complete,
      hasSeller: lastReturn.clientId != null,
      missingDocs: [...missingDocs],
      lastReturn: {
        id: lastReturn.id,
        clientName,
        returnDate: new Date(lastReturn.returnDate).toISOString().split('T')[0],
      },
      canBecomeAvailable,
    };
  }

  async completeExpediente(
    user: UserPayload,
    id: string,
  ): Promise<CatalogUnit> {
    this.assertCanWrite(user);
    const unit = await this.findOne(user, id);

    if (unit.status !== CatalogUnitStatusEnum.PENDING_EXPEDIENTE) {
      throw new BadRequestException(
        'Solo unidades con expediente pendiente pueden completarse',
      );
    }

    const status = await this.getExpedienteStatus(user, id);
    if (!status.complete) {
      throw new BadRequestException(
        `Expediente incompleto. Faltan documentos: ${status.missingDocs.join(', ')}`,
      );
    }

    unit.status = CatalogUnitStatusEnum.AVAILABLE;
    return this.unitRepo.save(unit);
  }

  async updateLocation(
    user: UserPayload,
    id: string,
    locationId: string,
  ): Promise<CatalogUnit> {
    this.assertCanWrite(user);
    const unit = await this.findOne(user, id);

    const location = await this.locationRepo.findOne({
      where: { id: locationId, branchId: unit.branchId },
    });
    if (!location) {
      throw new NotFoundException('Ubicación no encontrada');
    }

    unit.locationId = locationId;
    return this.unitRepo.save(unit);
  }
}
