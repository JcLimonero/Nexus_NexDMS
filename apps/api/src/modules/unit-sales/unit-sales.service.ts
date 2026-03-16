import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  UnitSale,
  UnitSaleStatusEnum,
  UnitSaleFinancingTypeEnum,
} from './entities/unit-sale.entity';
import {
  PaymentPlan,
  PaymentPlanStatusEnum,
} from './entities/payment-plan.entity';
import {
  PaymentPlanInstallment,
  PaymentPlanInstallmentStatusEnum,
} from './entities/payment-plan-installment.entity';
import {
  CatalogUnit,
  CatalogUnitStatusEnum,
} from '../catalog-units/entities/catalog-unit.entity';
import { Client } from '../clients/entities/client.entity';
import {
  UnitReservation,
  UnitReservationStatusEnum,
} from '../unit-reservations/entities/unit-reservation.entity';
import { CreateUnitSaleDto } from './dto/create-unit-sale.dto';
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
import { FilterUnitSalesDto } from './dto/filter-unit-sales.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { CfdiService } from '../cfdi/cfdi.service';
import { UnitAccessoriesService } from '../unit-accessories/unit-accessories.service';
import { UnitSaleAccessory } from '../unit-accessories/entities/unit-sale-accessory.entity';
import { UnitSaleExtra } from '../unit-sale-extras/entities/unit-sale-extra.entity';

@Injectable()
export class UnitSalesService {
  private readonly logger = new Logger(UnitSalesService.name);

  constructor(
    @InjectRepository(UnitSale)
    private readonly saleRepo: Repository<UnitSale>,
    @InjectRepository(PaymentPlan)
    private readonly planRepo: Repository<PaymentPlan>,
    @InjectRepository(PaymentPlanInstallment)
    private readonly installmentRepo: Repository<PaymentPlanInstallment>,
    @InjectRepository(CatalogUnit)
    private readonly catalogUnitRepo: Repository<CatalogUnit>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(UnitReservation)
    private readonly reservationRepo: Repository<UnitReservation>,
    @InjectRepository(UnitSaleExtra)
    private readonly saleExtraRepo: Repository<UnitSaleExtra>,
    private readonly dataSource: DataSource,
    private readonly cfdiService: CfdiService,
    private readonly unitAccessoriesService: UnitAccessoriesService,
  ) {}

  private async generateFolio(
    tenantId: string,
    em?: EntityManager,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const runner = em ?? this.dataSource.manager;
    const result = await runner.query<{ last_value: number }[]>(
      `INSERT INTO unit_sale_folio_seq (tenant_id, year, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, year) DO UPDATE SET last_value = unit_sale_folio_seq.last_value + 1
       RETURNING last_value`,
      [tenantId, year],
    );
    const seq = result[0]?.last_value ?? 1;
    return `VU-${year}-${String(seq).padStart(4, '0')}`;
  }

  private applyScope(
    qb: ReturnType<Repository<UnitSale>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('cu.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = cu.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo SELLER, MANAGER y ADMIN pueden gestionar ventas de unidades',
      );
    }
  }

  private assertCanCancel(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo MANAGER y ADMIN pueden cancelar ventas de unidades',
      );
    }
  }

  async findAll(
    user: UserPayload,
    filters: FilterUnitSalesDto,
  ): Promise<UnitSale[]> {
    const qb = this.saleRepo
      .createQueryBuilder('us')
      .innerJoin('us.catalogUnit', 'cu')
      .where('us.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.clientId) {
      qb.andWhere('us.client_id = :clientId', { clientId: filters.clientId });
    }
    if (filters.status) {
      qb.andWhere('us.status = :status', { status: filters.status });
    }
    if (filters.financingType) {
      qb.andWhere('us.financing_type = :financingType', {
        financingType: filters.financingType,
      });
    }
    if (filters.branchId) {
      qb.andWhere('cu.branch_id = :branchId', { branchId: filters.branchId });
    }
    if (filters.dateFrom) {
      qb.andWhere('us.created_at >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      qb.andWhere('us.created_at <= :dateTo', {
        dateTo: `${filters.dateTo}T23:59:59`,
      });
    }

    return qb.orderBy('us.created_at', 'DESC').getMany();
  }

  async findOne(user: UserPayload, id: string): Promise<UnitSale> {
    const qb = this.saleRepo
      .createQueryBuilder('us')
      .innerJoin('us.catalogUnit', 'cu')
      .where('us.id = :id', { id })
      .andWhere('us.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    const sale = await qb.getOne();
    if (!sale) {
      throw new NotFoundException(`Venta de unidad ${id} no encontrada`);
    }
    return sale;
  }

  async create(user: UserPayload, dto: CreateUnitSaleDto): Promise<UnitSale> {
    this.assertCanWrite(user);

    return this.dataSource.transaction(async (em) => {
      const unit = await em.findOne(CatalogUnit, {
        where: { id: dto.catalogUnitId, tenantId: user.tenantId },
      });
      if (!unit) {
        throw new NotFoundException('Unidad no encontrada');
      }

      if (unit.status === CatalogUnitStatusEnum.SOLD) {
        throw new BadRequestException('La unidad ya está vendida');
      }

      const client = await em.findOne(Client, {
        where: { id: dto.clientId, tenantId: user.tenantId },
      });
      if (!client) {
        throw new NotFoundException('Cliente no encontrado');
      }

      let advanceApplied = 0;
      let reservationId: string | null = null;

      if (dto.reservationId) {
        const reservation = await em.findOne(UnitReservation, {
          where: {
            id: dto.reservationId,
            catalogUnitId: dto.catalogUnitId,
            status: UnitReservationStatusEnum.ACTIVE,
          },
        });
        if (!reservation) {
          throw new BadRequestException(
            'Apartado no encontrado o no está activo para esta unidad',
          );
        }
        advanceApplied = Number(reservation.advanceAmount);
        reservationId = reservation.id;
      }

      const folio = await this.generateFolio(user.tenantId, em);

      let accessoriesTotal = 0;
      const sale = em.create(UnitSale, {
        catalogUnitId: dto.catalogUnitId,
        clientId: dto.clientId,
        userId: user.sub,
        reservationId,
        folio,
        listPrice: unit.listPrice,
        finalPrice: dto.finalPrice,
        advanceApplied,
        downPayment: dto.downPayment,
        financingType: dto.financingType,
        bankFinancier: dto.bankFinancier ?? null,
        bankFolio: dto.bankFolio ?? null,
        status: UnitSaleStatusEnum.IN_PROGRESS,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        notes: dto.notes ?? null,
        tenantId: user.tenantId,
      });
      const savedSale = await em.save(UnitSale, sale);

      if (dto.accessories?.length) {
        const compatible =
          await this.unitAccessoriesService.getCompatibleAccessories(
            user,
            dto.catalogUnitId,
          );
        const compatibleIds = new Set(compatible.map((a) => a.id));
        for (const item of dto.accessories) {
          if (!compatibleIds.has(item.accessoryId)) {
            throw new BadRequestException(
              `Accesorio ${item.accessoryId} no es compatible con la unidad`,
            );
          }
          const accessory = compatible.find((a) => a.id === item.accessoryId);
          if (accessory) {
            const lineTotal = Number(accessory.price) * item.quantity;
            accessoriesTotal += lineTotal;
            await em.save(UnitSaleAccessory, {
              unitSaleId: savedSale.id,
              accessoryId: item.accessoryId,
              quantity: item.quantity,
              unitPrice: accessory.price,
            });
          }
        }
        savedSale.finalPrice = Number(unit.listPrice) + accessoriesTotal;
        await em.save(UnitSale, savedSale);
      }

      if (dto.extras?.length) {
        for (const item of dto.extras) {
          await em.save(UnitSaleExtra, {
            unitSaleId: savedSale.id,
            type: item.type,
            providerName: item.providerName ?? null,
            providerReference: item.providerReference ?? null,
            cost: item.cost,
            notes: item.notes ?? null,
            extraData: item.extraData ?? null,
          });
        }
        const extrasTotal = dto.extras.reduce((s, e) => s + e.cost, 0);
        savedSale.finalPrice = Number(savedSale.finalPrice) + extrasTotal;
        await em.save(UnitSale, savedSale);
      }

      return savedSale;
    });
  }

  async complete(user: UserPayload, id: string): Promise<UnitSale> {
    this.assertCanWrite(user);

    const sale = await this.findOne(user, id);

    if (sale.status !== UnitSaleStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        `Solo se pueden completar ventas en proceso (estatus actual: ${sale.status})`,
      );
    }

    if (sale.financingType === UnitSaleFinancingTypeEnum.AGENCY_CREDIT) {
      const plan = await this.planRepo.findOne({
        where: { unitSaleId: id },
      });
      if (!plan) {
        throw new BadRequestException(
          'Para crédito agencia debe existir un plan de pago creado',
        );
      }
    }

    return this.dataSource
      .transaction(async (em) => {
        sale.status = UnitSaleStatusEnum.COMPLETED;
        await em.save(UnitSale, sale);

        const unit = await em.findOne(CatalogUnit, {
          where: { id: sale.catalogUnitId },
        });
        if (unit) {
          unit.status = CatalogUnitStatusEnum.SOLD;
          await em.save(CatalogUnit, unit);
        }

        if (sale.reservationId) {
          await em.update(
            UnitReservation,
            { id: sale.reservationId },
            { status: UnitReservationStatusEnum.CONVERTED },
          );
        }

        return sale;
      })
      .then(async (updatedSale) => {
        try {
          await this.cfdiService.generarIngreso('UnitSale', updatedSale.id);
        } catch (e) {
          this.logger.warn('CFDI no generado', e);
        }
        return updatedSale;
      });
  }

  async cancel(
    user: UserPayload,
    id: string,
    _reason: string,
  ): Promise<UnitSale> {
    this.assertCanCancel(user);

    const sale = await this.findOne(user, id);

    if (sale.status !== UnitSaleStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        `Solo se pueden cancelar ventas en proceso (estatus actual: ${sale.status})`,
      );
    }

    sale.status = UnitSaleStatusEnum.CANCELLED;
    await this.saleRepo.save(sale);

    return sale;
  }

  async createPaymentPlan(
    user: UserPayload,
    saleId: string,
    dto: CreatePaymentPlanDto,
  ): Promise<PaymentPlan> {
    this.assertCanWrite(user);

    const sale = await this.findOne(user, saleId);

    if (sale.status !== UnitSaleStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        'Solo se puede crear plan de pago en ventas en proceso',
      );
    }

    if (sale.financingType !== UnitSaleFinancingTypeEnum.AGENCY_CREDIT) {
      throw new BadRequestException(
        'El plan de pago solo aplica para crédito agencia',
      );
    }

    const existing = await this.planRepo.findOne({
      where: { unitSaleId: saleId },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya existe un plan de pago para esta venta',
      );
    }

    const principal =
      Number(sale.finalPrice) -
      Number(sale.downPayment) -
      Number(sale.advanceApplied);
    const monthlyRate = Number(dto.interestRate) / 100 / 12;
    const n = dto.installmentCount;
    const monthlyAmount =
      monthlyRate > 0
        ? (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) /
          (Math.pow(1 + monthlyRate, n) - 1)
        : principal / n;
    const totalAmount = monthlyAmount * n;

    const plan = this.planRepo.create({
      unitSaleId: saleId,
      installmentCount: dto.installmentCount,
      monthlyAmount: Math.round(monthlyAmount * 100) / 100,
      interestRate: dto.interestRate,
      totalAmount: Math.round(totalAmount * 100) / 100,
      firstPaymentDate: new Date(dto.firstPaymentDate),
      status: PaymentPlanStatusEnum.ACTIVE,
    });
    const saved = await this.planRepo.save(plan);

    const installments: Partial<PaymentPlanInstallment>[] = [];
    const dueDate = new Date(dto.firstPaymentDate);
    const amount = Math.round(monthlyAmount * 100) / 100;

    for (let i = 1; i <= dto.installmentCount; i++) {
      installments.push({
        paymentPlanId: saved.id,
        installmentNumber: i,
        amount,
        dueDate: new Date(dueDate),
        status: PaymentPlanInstallmentStatusEnum.PENDING,
      });
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    await this.installmentRepo.save(installments);

    return this.planRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['installments'],
    });
  }

  async addAccessory(
    user: UserPayload,
    saleId: string,
    accessoryId: string,
    quantity: number,
  ): Promise<UnitSaleAccessory> {
    this.assertCanWrite(user);
    const sale = await this.findOne(user, saleId);
    if (sale.status !== UnitSaleStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        'Solo se pueden agregar accesorios a ventas en proceso',
      );
    }
    const compatible =
      await this.unitAccessoriesService.getCompatibleAccessories(
        user,
        sale.catalogUnitId,
      );
    if (!compatible.some((a) => a.id === accessoryId)) {
      throw new BadRequestException(
        'El accesorio no es compatible con la unidad de esta venta',
      );
    }
    const line = await this.unitAccessoriesService.addAccessoryToSale(
      user,
      saleId,
      accessoryId,
      quantity,
    );
    const accessories =
      await this.unitAccessoriesService.getSaleAccessories(saleId);
    const accessoriesTotal = accessories.reduce(
      (sum, a) => sum + Number(a.unitPrice) * a.quantity,
      0,
    );
    const unit = await this.catalogUnitRepo.findOne({
      where: { id: sale.catalogUnitId },
    });
    const basePrice = unit ? Number(unit.listPrice) : Number(sale.listPrice);
    sale.finalPrice = basePrice + accessoriesTotal;
    await this.saleRepo.save(sale);
    return line;
  }

  async removeAccessory(
    user: UserPayload,
    saleId: string,
    unitSaleAccessoryId: string,
  ): Promise<void> {
    this.assertCanWrite(user);
    const sale = await this.findOne(user, saleId);
    if (sale.status !== UnitSaleStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        'Solo se pueden quitar accesorios de ventas en proceso',
      );
    }
    await this.unitAccessoriesService.removeAccessoryFromSale(
      user,
      saleId,
      unitSaleAccessoryId,
    );
    const accessories =
      await this.unitAccessoriesService.getSaleAccessories(saleId);
    const accessoriesTotal = accessories.reduce(
      (sum, a) => sum + Number(a.unitPrice) * a.quantity,
      0,
    );
    const unit = await this.catalogUnitRepo.findOne({
      where: { id: sale.catalogUnitId },
    });
    const basePrice = unit ? Number(unit.listPrice) : Number(sale.listPrice);
    sale.finalPrice = basePrice + accessoriesTotal;
    await this.saleRepo.save(sale);
  }

  async getAccessories(
    user: UserPayload,
    saleId: string,
  ): Promise<UnitSaleAccessory[]> {
    await this.findOne(user, saleId);
    return this.unitAccessoriesService.getSaleAccessories(saleId);
  }

  async getPaymentPlan(
    user: UserPayload,
    saleId: string,
  ): Promise<PaymentPlan | null> {
    await this.findOne(user, saleId);
    return this.planRepo.findOne({
      where: { unitSaleId: saleId },
      relations: ['installments'],
    });
  }

  async registerInstallmentPayment(
    user: UserPayload,
    saleId: string,
    installmentId: string,
    dto: {
      paymentDate: string;
      paymentMethod: string;
      paymentReference?: string;
    },
  ): Promise<PaymentPlanInstallment> {
    this.assertCanWrite(user);

    await this.findOne(user, saleId);

    const installment = await this.installmentRepo.findOne({
      where: { id: installmentId },
      relations: ['paymentPlan'],
    });
    if (!installment || installment.paymentPlan?.unitSaleId !== saleId) {
      throw new NotFoundException('Parcialidad no encontrada');
    }

    if (installment.status === PaymentPlanInstallmentStatusEnum.PAID) {
      throw new BadRequestException('Esta parcialidad ya está pagada');
    }

    installment.paidDate = new Date(dto.paymentDate);
    installment.status = PaymentPlanInstallmentStatusEnum.PAID;
    installment.paymentMethod = dto.paymentMethod;
    installment.paymentReference = dto.paymentReference ?? null;
    await this.installmentRepo.save(installment);

    const plan = installment.paymentPlan;
    const pending = await this.installmentRepo.count({
      where: {
        paymentPlanId: plan.id,
        status: PaymentPlanInstallmentStatusEnum.PENDING,
      },
    });

    if (pending === 0) {
      await this.planRepo.update(
        { id: plan.id },
        { status: PaymentPlanStatusEnum.PAID_OFF },
      );
    }

    return installment;
  }
}
