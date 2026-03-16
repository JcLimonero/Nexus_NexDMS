import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Quotation } from './entities/quotation.entity';
import {
  QuotationStatusEnum,
  QuotationTypeEnum,
  QuotationPriceListEnum,
} from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { FilterQuotationsDto } from './dto/filter-quotations.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private readonly itemRepo: Repository<QuotationItem>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Part)
    private readonly partRepo: Repository<Part>,
    @InjectRepository(CatalogUnit)
    private readonly catalogUnitRepo: Repository<CatalogUnit>,
    private readonly dataSource: DataSource,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<Quotation>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.BRANCH:
        qb.andWhere('q.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.BRAND:
        if (!user.brandId) return;
        qb.innerJoin('branches', 'b', 'b.id = q.branch_id').andWhere(
          'b.brand_id = :brandId',
          { brandId: user.brandId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private async generateFolio(
    tenantId: string,
    em?: EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const runner = em ?? this.dataSource.manager;
    const result = await runner.query<{ last_value: number }[]>(
      `INSERT INTO quotation_folio_seq (tenant_id, year, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, year) DO UPDATE SET last_value = quotation_folio_seq.last_value + 1
       RETURNING last_value`,
      [tenantId, year],
    );
    const seq = result[0]?.last_value ?? 1;
    return `COT-${year}-${String(seq).padStart(4, '0')}`;
  }

  private getPriceFromPart(
    part: Part,
    priceList: QuotationPriceListEnum,
  ): number {
    switch (priceList) {
      case QuotationPriceListEnum.PUBLIC:
        return Number(part.publicPrice);
      case QuotationPriceListEnum.WHOLESALE:
        return Number(part.wholesalePrice);
      case QuotationPriceListEnum.BUSINESS:
        return Number(part.businessPrice);
      default:
        return Number(part.publicPrice);
    }
  }

  private getPriceFromCatalogUnit(
    unit: CatalogUnit,
    priceList: QuotationPriceListEnum,
  ): number {
    if (priceList === QuotationPriceListEnum.BUSINESS) {
      return Number(unit.salePrice);
    }
    return Number(unit.listPrice);
  }

  async create(user: UserPayload, dto: CreateQuotationDto): Promise<Quotation> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(
        'Solo CASHIER, SELLER y ADMIN pueden crear cotizaciones',
      );
    }

    if (!dto.items?.length) {
      throw new BadRequestException('Debe incluir al menos un ítem');
    }

    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId, tenantId: user.tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const taxRate = Number(branch.taxRate) || 0.16;
    const maxDiscountPct = Number(branch.maxDiscountPct) || 10;
    const discountPct = dto.discountPct ?? 0;

    let status = QuotationStatusEnum.DRAFT;
    if (discountPct > maxDiscountPct) {
      status = QuotationStatusEnum.PENDING_APPROVAL;
    }

    let subtotal = 0;
    const itemsData: Array<{
      partId?: string;
      catalogUnitId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      subtotal: number;
    }> = [];

    for (const item of dto.items) {
      let unitPrice = item.unitPrice;
      let description = item.description ?? '';

      if (item.partId) {
        const part = await this.partRepo.findOne({
          where: {
            id: item.partId,
            branchId: dto.branchId,
            tenantId: user.tenantId,
          },
        });
        if (!part) {
          throw new NotFoundException(`Parte ${item.partId} no encontrada`);
        }
        unitPrice = this.getPriceFromPart(part, dto.priceList);
        description = part.name;
      } else if (item.catalogUnitId) {
        const unit = await this.catalogUnitRepo.findOne({
          where: {
            id: item.catalogUnitId,
            branchId: dto.branchId,
            tenantId: user.tenantId,
          },
        });
        if (!unit) {
          throw new NotFoundException(
            `Unidad ${item.catalogUnitId} no encontrada`,
          );
        }
        unitPrice = this.getPriceFromCatalogUnit(unit, dto.priceList);
        description = `${unit.brand} ${unit.model} ${unit.year}`;
      } else if (item.description) {
        description = item.description;
      } else {
        throw new BadRequestException(
          'Cada ítem debe tener parte, unidad o descripción',
        );
      }

      const discount = item.discount ?? 0;
      const itemSubtotal = item.quantity * unitPrice - discount;
      subtotal += itemSubtotal;
      itemsData.push({
        partId: item.partId ?? undefined,
        catalogUnitId: item.catalogUnitId ?? undefined,
        description,
        quantity: item.quantity,
        unitPrice,
        discount,
        subtotal: itemSubtotal,
      });
    }

    const discountAmount = (subtotal * discountPct) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = Math.round(subtotalAfterDiscount * taxRate * 100) / 100;
    const total = subtotalAfterDiscount + taxAmount;

    let validityDate: Date | null = null;
    if (dto.validityDate) {
      validityDate = new Date(dto.validityDate);
    } else if (branch.quotationValidityDays) {
      const d = new Date();
      d.setDate(d.getDate() + branch.quotationValidityDays);
      validityDate = d;
    }

    return this.dataSource
      .transaction(async (em) => {
        const folio = await this.generateFolio(user.tenantId, em);

        const quotation = em.create(Quotation, {
          tenantId: user.tenantId,
          branchId: dto.branchId,
          clientId: dto.clientId ?? null,
          userId: user.sub,
          approverId: null,
          type: dto.type,
          folio,
          status,
          priceList: dto.priceList,
          subtotal,
          discountPct,
          discountAmount,
          taxAmount,
          total,
          conditions: dto.conditions ?? null,
          validityDate,
        });
        const saved = await em.save(quotation);

        for (const it of itemsData) {
          const qi = em.create(QuotationItem, {
            quotationId: saved.id,
            partId: it.partId ?? null,
            catalogUnitId: it.catalogUnitId ?? null,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount,
            subtotal: it.subtotal,
          });
          await em.save(qi);
        }

        return saved.id;
      })
      .then((id) => this.findOne(user, id));
  }

  async findAll(
    user: UserPayload,
    filters: FilterQuotationsDto,
  ): Promise<{
    data: Quotation[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.quotationRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.items', 'items')
      .leftJoinAndSelect('items.part', 'part')
      .leftJoinAndSelect('items.catalogUnit', 'catalogUnit')
      .leftJoinAndSelect('q.client', 'client')
      .leftJoinAndSelect('q.branch', 'branch')
      .leftJoinAndSelect('q.user', 'user')
      .where('q.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.type) {
      qb.andWhere('q.type = :type', { type: filters.type });
    }
    if (filters.status) {
      qb.andWhere('q.status = :status', { status: filters.status });
    }
    if (filters.clientId) {
      qb.andWhere('q.client_id = :clientId', {
        clientId: filters.clientId,
      });
    }
    if (filters.branchId) {
      qb.andWhere('q.branch_id = :branchId', {
        branchId: filters.branchId,
      });
    }
    if (filters.dateFrom) {
      qb.andWhere('q.created_at >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      qb.andWhere('q.created_at <= :dateTo', {
        dateTo: `${filters.dateTo}T23:59:59.999Z`,
      });
    }

    const [data, total] = await qb
      .orderBy('q.created_at', 'DESC')
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

  async findOne(user: UserPayload, id: string): Promise<Quotation> {
    const quotation = await this.quotationRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: [
        'items',
        'items.part',
        'items.catalogUnit',
        'client',
        'branch',
        'user',
        'approver',
      ],
    });
    if (!quotation) {
      throw new NotFoundException(`Cotización ${id} no encontrada`);
    }
    const qb = this.quotationRepo
      .createQueryBuilder('q')
      .where('q.id = :id', { id })
      .andWhere('q.tenant_id = :tenantId', { tenantId: user.tenantId });
    this.applyScope(qb, user);
    const found = await qb.getOne();
    if (!found) {
      throw new NotFoundException(`Cotización ${id} no encontrada`);
    }
    return quotation;
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateQuotationDto,
  ): Promise<Quotation> {
    const quotation = await this.findOne(user, id);
    if (quotation.status !== QuotationStatusEnum.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden editar cotizaciones en borrador',
      );
    }
    await this.quotationRepo.update(id, dto as Partial<Quotation>);
    return this.findOne(user, id);
  }

  async approve(user: UserPayload, id: string): Promise<Quotation> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(
        'Solo GERENTE o ADMIN pueden aprobar cotizaciones',
      );
    }
    const quotation = await this.findOne(user, id);
    if (quotation.status !== QuotationStatusEnum.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Solo cotizaciones pendientes de aprobación pueden ser aprobadas',
      );
    }
    await this.quotationRepo.update(id, {
      status: QuotationStatusEnum.APPROVED,
      approverId: user.sub,
    });
    return this.findOne(user, id);
  }

  async reject(
    user: UserPayload,
    id: string,
    _reason?: string,
  ): Promise<Quotation> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(
        'Solo GERENTE o ADMIN pueden rechazar cotizaciones',
      );
    }
    const quotation = await this.findOne(user, id);
    if (quotation.status !== QuotationStatusEnum.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Solo cotizaciones pendientes de aprobación pueden ser rechazadas',
      );
    }
    await this.quotationRepo.update(id, {
      status: QuotationStatusEnum.REJECTED,
      approverId: user.sub,
    });
    return this.findOne(user, id);
  }

  async send(user: UserPayload, id: string): Promise<Quotation> {
    const quotation = await this.findOne(user, id);
    const allowedStatuses = [
      QuotationStatusEnum.DRAFT,
      QuotationStatusEnum.APPROVED,
    ];
    if (!allowedStatuses.includes(quotation.status)) {
      throw new BadRequestException(
        'Solo cotizaciones en borrador o aprobadas pueden enviarse',
      );
    }
    await this.quotationRepo.update(id, {
      status: QuotationStatusEnum.SENT,
    });
    return this.findOne(user, id);
  }

  async convert(
    user: UserPayload,
    id: string,
  ): Promise<{ type: string; id?: string }> {
    const quotation = await this.findOne(user, id);
    if (quotation.status === QuotationStatusEnum.CONVERTED) {
      throw new BadRequestException('Esta cotización ya fue convertida');
    }
    const allowedStatuses = [
      QuotationStatusEnum.SENT,
      QuotationStatusEnum.ACCEPTED,
      QuotationStatusEnum.APPROVED,
    ];
    if (!allowedStatuses.includes(quotation.status)) {
      throw new BadRequestException(
        'Solo cotizaciones enviadas, aceptadas o aprobadas pueden convertirse',
      );
    }
    await this.quotationRepo.update(id, {
      status: QuotationStatusEnum.CONVERTED,
    });
    return {
      type:
        quotation.type === QuotationTypeEnum.UNIT
          ? 'unit_sale'
          : 'service_order',
      id: undefined,
    };
  }
}
