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
import {
  QuotationItem,
  QuotationLineUrgencyEnum,
} from './entities/quotation-item.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import {
  CreateQuotationDto,
  CreateQuotationItemDto,
} from './dto/create-quotation.dto';
import { FilterQuotationsDto } from './dto/filter-quotations.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { BranchesService } from '../branches/branches.service';
import { UnitSalesService } from '../unit-sales/unit-sales.service';
import { UnitSaleFinancingTypeEnum } from '../unit-sales/entities/unit-sale.entity';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { QuotationItemPhoto } from './entities/quotation-item-photo.entity';
import { StorageService } from '../../common/storage/storage.service';

type QuotationRefData = {
  partId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};
type QuotationItemData = {
  partId?: string;
  catalogUnitId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  urgency?: QuotationLineUrgencyEnum;
  technicianNote?: string | null;
  refacciones: QuotationRefData[];
};

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
    @InjectRepository(QuotationItemPhoto)
    private readonly photoRepo: Repository<QuotationItemPhoto>,
    private readonly dataSource: DataSource,
    private readonly branchesService: BranchesService,
    private readonly unitSalesService: UnitSalesService,
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Sube una foto a una línea del presupuesto (lo que se recomienda cambiar).
   * El archivo va al almacenamiento privado; se devuelve una liga temporal.
   */
  async subirFotoLinea(
    user: UserPayload,
    quotationId: string,
    itemId: string,
    file: Express.Multer.File,
  ): Promise<{ id: string; url: string | null }> {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    // La cotización debe ser del tenant; el ítem, de esa cotización.
    const quotation = await this.quotationRepo.findOne({
      where: { id: quotationId, tenantId: user.tenantId },
    });
    if (!quotation) throw new NotFoundException('Cotización no encontrada');
    const item = await this.itemRepo.findOne({
      where: { id: itemId, quotationId },
    });
    if (!item) throw new NotFoundException('Línea no encontrada');

    const key = `presupuestos/${quotationId}/lineas/${itemId}/${Date.now()}`;
    await this.storage.upload(file.buffer, key, file.mimetype);
    const foto = await this.photoRepo.save(
      this.photoRepo.create({ quotationItemId: itemId, storageKey: key }),
    );

    let url: string | null = null;
    try {
      url = await this.storage.getSignedUrl(key);
    } catch {
      url = null;
    }
    return { id: foto.id, url };
  }

  private applyScope(
    qb: ReturnType<Repository<Quotation>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('q.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = q.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
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

  /** Resuelve precios y arma los ítems: trabajos con sus refacciones hijas. */
  private async buildItemsData(
    user: UserPayload,
    branchId: string,
    priceList: QuotationPriceListEnum,
    items: CreateQuotationItemDto[],
  ): Promise<{ itemsData: QuotationItemData[]; subtotal: number }> {
    let subtotal = 0;
    const itemsData: QuotationItemData[] = [];
    for (const item of items) {
      let unitPrice = item.unitPrice ?? 0;
      let description = item.description ?? '';

      if (item.partId) {
        const part = await this.partRepo.findOne({
          where: { id: item.partId, branchId, tenantId: user.tenantId },
        });
        if (!part) {
          throw new NotFoundException(`Parte ${item.partId} no encontrada`);
        }
        unitPrice = this.getPriceFromPart(part, priceList);
        description = part.name;
      } else if (item.catalogUnitId) {
        const unit = await this.catalogUnitRepo.findOne({
          where: { id: item.catalogUnitId, branchId, tenantId: user.tenantId },
        });
        if (!unit) {
          throw new NotFoundException(
            `Unidad ${item.catalogUnitId} no encontrada`,
          );
        }
        unitPrice = this.getPriceFromCatalogUnit(unit, priceList);
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

      const refacciones: QuotationRefData[] = [];
      for (const r of item.refacciones ?? []) {
        const part = await this.partRepo.findOne({
          where: { id: r.partId, branchId, tenantId: user.tenantId },
        });
        if (!part) {
          throw new NotFoundException(`Parte ${r.partId} no encontrada`);
        }
        const rPrice = r.unitPrice ?? this.getPriceFromPart(part, priceList);
        const rSub = r.quantity * rPrice;
        subtotal += rSub;
        refacciones.push({
          partId: r.partId,
          description: part.name,
          quantity: r.quantity,
          unitPrice: rPrice,
          subtotal: rSub,
        });
      }

      itemsData.push({
        partId: item.partId ?? undefined,
        catalogUnitId: item.catalogUnitId ?? undefined,
        description,
        quantity: item.quantity,
        unitPrice,
        discount,
        subtotal: itemSubtotal,
        urgency: item.urgency,
        technicianNote: item.technicianNote ?? null,
        refacciones,
      });
    }
    return { itemsData, subtotal };
  }

  /** Guarda los trabajos y sus refacciones (hijas) bajo la cotización. */
  private async saveItemsData(
    em: EntityManager,
    quotationId: string,
    itemsData: QuotationItemData[],
  ): Promise<void> {
    for (const it of itemsData) {
      const qi = em.create(QuotationItem, {
        quotationId,
        partId: it.partId ?? null,
        catalogUnitId: it.catalogUnitId ?? null,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        subtotal: it.subtotal,
        ...(it.urgency ? { urgency: it.urgency } : {}),
        technicianNote: it.technicianNote ?? null,
      });
      await em.save(qi);
      for (const r of it.refacciones) {
        await em.save(
          em.create(QuotationItem, {
            quotationId,
            parentItemId: qi.id,
            partId: r.partId,
            description: r.description,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
            discount: 0,
            subtotal: r.subtotal,
          }),
        );
      }
    }
  }

  async create(user: UserPayload, dto: CreateQuotationDto): Promise<Quotation> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo CASHIER, SELLER y ADMIN pueden crear cotizaciones',
      );
    }

    if (!dto.items?.length) {
      throw new BadRequestException('Debe incluir al menos un ítem');
    }

    await this.branchesService.assertBranchInScope(user, dto.branchId);
    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId, tenantId: user.tenantId },
    });

    const taxRate = Number(branch?.taxRate) || 0.16;
    const maxDiscountPct = Number(branch?.maxDiscountPct) || 10;
    const discountPct = dto.discountPct ?? 0;

    let status = QuotationStatusEnum.DRAFT;
    if (discountPct > maxDiscountPct) {
      status = QuotationStatusEnum.PENDING_APPROVAL;
    }

    const { itemsData, subtotal } = await this.buildItemsData(
      user,
      dto.branchId,
      dto.priceList,
      dto.items,
    );

    const discountAmount = (subtotal * discountPct) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = Math.round(subtotalAfterDiscount * taxRate * 100) / 100;
    const total = subtotalAfterDiscount + taxAmount;

    let validityDate: Date | null = null;
    if (dto.validityDate) {
      validityDate = new Date(dto.validityDate);
    } else if (branch?.quotationValidityDays) {
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
        await this.saveItemsData(em, saved.id, itemsData);
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
      .orderBy('q.createdAt', 'DESC')
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

    const branchId = dto.branchId ?? quotation.branchId;
    const priceList = (dto.priceList ??
      quotation.priceList) as QuotationPriceListEnum;

    // Con ítems: se reconstruyen (se borran los viejos y se crean los nuevos)
    // y se recalculan los totales. Sin ítems: solo la cabecera.
    if (dto.items?.length) {
      const branch = await this.branchRepo.findOne({
        where: { id: branchId, tenantId: user.tenantId },
      });
      const taxRate = Number(branch?.taxRate) || 0.16;
      const discountPct = dto.discountPct ?? Number(quotation.discountPct) ?? 0;
      const { itemsData, subtotal } = await this.buildItemsData(
        user,
        branchId,
        priceList,
        dto.items,
      );
      const discountAmount = (subtotal * discountPct) / 100;
      const subtotalAfterDiscount = subtotal - discountAmount;
      const taxAmount = Math.round(subtotalAfterDiscount * taxRate * 100) / 100;
      const total = subtotalAfterDiscount + taxAmount;
      const validityDate = dto.validityDate
        ? new Date(dto.validityDate)
        : quotation.validityDate
          ? new Date(quotation.validityDate)
          : null;

      await this.dataSource.transaction(async (em) => {
        await em.delete(QuotationItem, { quotationId: id });
        await em.update(Quotation, id, {
          branchId,
          clientId: dto.clientId ?? quotation.clientId ?? null,
          priceList,
          type: dto.type ?? quotation.type,
          conditions: dto.conditions ?? quotation.conditions ?? null,
          discountPct,
          discountAmount,
          taxAmount,
          subtotal,
          total,
          validityDate,
        });
        await this.saveItemsData(em, id, itemsData);
      });
    } else {
      const rest = { ...dto } as Record<string, unknown>;
      delete rest['items'];
      await this.quotationRepo.update(id, rest as Partial<Quotation>);
    }
    return this.findOne(user, id);
  }

  async approve(user: UserPayload, id: string): Promise<Quotation> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
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
    if (!allowed.some((r) => user.roles?.includes(r))) {
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

  /**
   * Convierte una cotización en lo que corresponde y cierra el círculo.
   *
   * Antes solo marcaba CONVERTED sin crear nada, que es lo que un vendedor no
   * entendía. Ahora:
   *  - UNIT → crea la venta de la unidad cotizada con su precio.
   *  - SERVICE → crea la orden de servicio para el vehículo indicado, con el
   *    trabajo cotizado como falla reportada.
   *  - PARTS → no se convierte sola: es una venta de mostrador que se cobra en
   *    caja, y ahí se emite; se avisa en vez de crear algo a medias.
   *
   * Se exige que la cotización tenga cliente, y el vehículo para las de
   * servicio, porque una orden no existe sin uno.
   */
  async convert(
    user: UserPayload,
    id: string,
    opts: { vehicleId?: string } = {},
  ): Promise<{ type: string; id: string; folio: string }> {
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
    if (!quotation.clientId) {
      throw new BadRequestException(
        'La cotización necesita un cliente para convertirse',
      );
    }

    if (quotation.type === QuotationTypeEnum.UNIT) {
      return this.convertirAVenta(user, quotation);
    }
    if (quotation.type === QuotationTypeEnum.SERVICE) {
      return this.convertirAOrden(user, quotation, opts.vehicleId);
    }
    throw new BadRequestException(
      'Una cotización de refacciones se cobra como venta de mostrador en caja, ' +
        'no se convierte en orden. Úsala como referencia al cobrar.',
    );
  }

  private async convertirAVenta(user: UserPayload, quotation: Quotation) {
    const unitItem = quotation.items?.find((i) => i.catalogUnitId);
    if (!unitItem?.catalogUnitId) {
      throw new BadRequestException(
        'La cotización no tiene una unidad para vender',
      );
    }
    const venta = await this.unitSalesService.create(user, {
      catalogUnitId: unitItem.catalogUnitId,
      clientId: quotation.clientId!,
      finalPrice: Number(quotation.total),
      downPayment: 0,
      financingType: UnitSaleFinancingTypeEnum.CASH,
      notes: `Originada de la cotización ${quotation.folio}`,
    });
    await this.quotationRepo.update(quotation.id, {
      status: QuotationStatusEnum.CONVERTED,
      convertedToType: 'unit_sale',
      convertedToId: venta.id,
    });
    return { type: 'unit_sale', id: venta.id, folio: venta.folio };
  }

  private async convertirAOrden(
    user: UserPayload,
    quotation: Quotation,
    vehicleId?: string,
  ) {
    if (!vehicleId) {
      throw new BadRequestException(
        'Indica el vehículo del cliente para abrir la orden de servicio',
      );
    }
    // El trabajo cotizado va como falla reportada, para no perderlo; el taller
    // arma los conceptos reales sobre la orden. No se descuentan refacciones
    // aquí: eso ocurre cuando el trabajo se ejecuta.
    const trabajo = (quotation.items ?? [])
      .map((i) => `• ${i.description} (x${i.quantity})`)
      .join('\n');
    const orden = await this.serviceOrdersService.create(user, {
      branchId: quotation.branchId,
      ownerId: quotation.clientId!,
      vehicleId,
      reportedFault:
        `Cotización ${quotation.folio}\n${trabajo}`.trim() ||
        `Cotización ${quotation.folio}`,
      kmIn: 0,
      quotationId: quotation.id,
    });
    await this.quotationRepo.update(quotation.id, {
      status: QuotationStatusEnum.CONVERTED,
      convertedToType: 'service_order',
      convertedToId: orden.id,
    });
    return { type: 'service_order', id: orden.id, folio: orden.folio };
  }
}
