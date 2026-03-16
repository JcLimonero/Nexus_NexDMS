import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CfdiLog,
  CfdiTypeEnum,
  CfdiStatusEnum,
} from '../cfdi-log/entities/cfdi-log.entity';
import { Branch } from '../branches/entities/branch.entity';
import { BranchConfig } from '../branches/entities/branch-config.entity';
import { Sale } from '../sales/entities/sale.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { UnitSale } from '../unit-sales/entities/unit-sale.entity';
import { Client } from '../clients/entities/client.entity';
import { StorageService } from '../../common/storage/storage.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import {
  CfdiFacturapiClient,
  type FacturapiInvoicePayload,
  type FacturapiCustomer,
  type FacturapiItem,
  type FacturapiPaymentComplementPayload,
} from './cfdi-facturapi.client';
import { CfdiGeneradoEvent } from '../../events/domain-events';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { FilterCfdiDto } from './dto/filter-cfdi.dto';
import { CancelCfdiDto } from './dto/cancel-cfdi.dto';
import { RegisterPagoDto } from './dto/register-pago.dto';

@Injectable()
export class CfdiService {
  constructor(
    @InjectRepository(CfdiLog)
    private readonly cfdiLogRepo: Repository<CfdiLog>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(BranchConfig)
    private readonly branchConfigRepo: Repository<BranchConfig>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(UnitSale)
    private readonly unitSaleRepo: Repository<UnitSale>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly storage: StorageService,
    private readonly encryption: EncryptionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<CfdiLog>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.BRANCH:
        qb.andWhere('c.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.BRAND:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = c.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  private async getApiKey(branchId: string): Promise<string> {
    const config = await this.branchConfigRepo.findOne({
      where: { branchId },
    });
    if (!config?.facturaapiApiKey) {
      throw new BadRequestException(
        'Credenciales de FacturAPI no configuradas para esta sucursal. Configure facturaapi_api_key en la sucursal.',
      );
    }
    try {
      return this.encryption.decrypt(config.facturaapiApiKey);
    } catch {
      return config.facturaapiApiKey;
    }
  }

  private buildCustomerFromClient(
    client: Client | null,
    branch: Branch,
  ): FacturapiCustomer {
    const legalName = client
      ? (client.companyName ??
        (`${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() ||
          'Público general'))
      : 'Público general';
    const taxId = client?.rfc ?? 'XAXX010101000';
    const taxSystem = client?.taxRegime ?? '616';
    const zip = client?.taxPostalCode ?? branch.taxPostalCode ?? '00000';
    const address = client?.address ?? branch.address;
    const city = client?.city ?? branch.city;
    const state = client?.state ?? branch.state;

    return {
      legal_name: legalName,
      tax_id: taxId,
      tax_system: taxSystem,
      address: {
        zip,
        street: address,
        city,
        state,
        country: 'MEX',
      },
    };
  }

  async generarIngreso(
    referenceType: 'Sale' | 'ServiceOrder' | 'UnitSale',
    referenceId: string,
  ): Promise<CfdiLog> {
    let branchId: string;
    let tenantId: string;
    let total: number;
    let clientData: { email?: string; phone?: string } | null = null;
    let clientEntity: Client | null = null;
    const items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }> = [];
    let referenceNumber: string;

    if (referenceType === 'Sale') {
      const sale = await this.saleRepo.findOne({
        where: { id: referenceId },
        relations: ['items', 'items.part', 'client', 'branch'],
      });
      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.cfdiUuid) {
        throw new BadRequestException('Esta venta ya tiene CFDI timbrado');
      }
      branchId = sale.branchId;
      tenantId = sale.tenantId;
      total = Number(sale.total);
      referenceNumber = sale.ticketNumber;
      if (sale.client) {
        clientData = {
          email: sale.client.email ?? undefined,
          phone: sale.client.phone,
        };
        clientEntity = sale.client;
      }
      for (const item of sale.items ?? []) {
        const part = item.part;
        items.push({
          description: part?.name ?? `Parte ${item.partId}`,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount) || 0,
        });
      }
    } else if (referenceType === 'ServiceOrder') {
      const so = await this.soRepo.findOne({
        where: { id: referenceId },
        relations: ['owner', 'parts', 'parts.part', 'branch'],
      });
      if (!so) throw new NotFoundException('Orden de servicio no encontrada');
      if (so.cfdiUuid) {
        throw new BadRequestException('Esta OS ya tiene CFDI timbrado');
      }
      branchId = so.branchId;
      tenantId = so.tenantId;
      total = Number(so.total);
      referenceNumber = so.folio;
      if (so.owner) {
        clientData = {
          email: so.owner.email ?? undefined,
          phone: so.owner.phone,
        };
        clientEntity = so.owner;
      }
      items.push({
        description: 'Mano de obra',
        quantity: 1,
        unitPrice: Number(so.laborCost),
        discount: Number(so.discount) || 0,
      });
      for (const p of so.parts ?? []) {
        const part = p.part;
        items.push({
          description: part?.name ?? `Parte ${p.partId}`,
          quantity: p.quantity,
          unitPrice: Number(p.unitPrice),
          discount: 0,
        });
      }
    } else {
      const us = await this.unitSaleRepo.findOne({
        where: { id: referenceId },
        relations: ['client', 'catalogUnit', 'catalogUnit.branch'],
      });
      if (!us) throw new NotFoundException('Venta de unidad no encontrada');
      if (us.cfdiUuid) {
        throw new BadRequestException('Esta venta ya tiene CFDI timbrado');
      }
      const cu = us.catalogUnit;
      if (!cu?.branchId) throw new NotFoundException('Unidad sin sucursal');
      branchId = cu.branchId;
      tenantId = us.tenantId;
      total = Number(us.finalPrice);
      referenceNumber = us.folio;
      if (us.client) {
        clientData = {
          email: us.client.email ?? undefined,
          phone: us.client.phone,
        };
        clientEntity = us.client;
      }
      const unit = `${cu.brand} ${cu.model} ${cu.year}`.trim() || 'Unidad';
      items.push({
        description: unit,
        quantity: 1,
        unitPrice: Number(us.finalPrice),
        discount: 0,
      });
    }

    const branchEntity = await this.branchRepo.findOne({
      where: { id: branchId },
    });
    if (!branchEntity) throw new NotFoundException('Sucursal no encontrada');

    const apiKey = await this.getApiKey(branchId);
    const clientFacturapi = new CfdiFacturapiClient(apiKey);

    const customer = this.buildCustomerFromClient(clientEntity, branchEntity);

    const facturapiItems: FacturapiItem[] = items.map((it) => ({
      product: {
        description: it.description,
        product_key: '84111506',
        unit_key: 'E48',
        unit_name: 'Servicio',
        price: it.unitPrice,
        tax_included: true,
      },
      quantity: it.quantity,
      discount: it.discount,
    }));

    const payload: FacturapiInvoicePayload = {
      customer,
      items: facturapiItems,
      use: 'G03',
      payment_form: '01',
      payment_method: 'PUE',
      series: branchEntity.cfdiSerie ?? 'A',
    };

    const invoice = await clientFacturapi.createInvoice(payload);
    const uuid = (invoice as { uuid?: string }).uuid ?? invoice.id;

    const xmlBuffer = await clientFacturapi.downloadXml(invoice.id);
    const pdfBuffer = await clientFacturapi.downloadPdf(invoice.id);

    const xmlKey = `documentos/${tenantId}/${branchId}/cfdi/${uuid}.xml`;
    const pdfKey = `documentos/${tenantId}/${branchId}/cfdi/${uuid}.pdf`;

    await this.storage.upload(xmlBuffer, xmlKey, 'application/xml');
    await this.storage.upload(pdfBuffer, pdfKey, 'application/pdf');

    const cfdiLog = this.cfdiLogRepo.create({
      tenantId,
      branchId,
      referenceId,
      referenceType,
      cfdiType: CfdiTypeEnum.INCOME,
      satUuid: uuid,
      facturaapiInvoiceId: invoice.id,
      series: branchEntity.cfdiSerie ?? 'A',
      fiscalFolio: referenceNumber,
      xmlKey,
      pdfKey,
      total,
      status: CfdiStatusEnum.VALID,
      stampedAt: new Date(),
    });
    const saved = await this.cfdiLogRepo.save(cfdiLog);

    if (referenceType === 'Sale') {
      await this.saleRepo.update(referenceId, { cfdiUuid: uuid });
    } else if (referenceType === 'ServiceOrder') {
      await this.soRepo.update(referenceId, { cfdiUuid: uuid });
    } else {
      await this.unitSaleRepo.update(referenceId, { cfdiUuid: uuid });
    }

    this.eventEmitter.emit(
      'cfdi.generado',
      new CfdiGeneradoEvent(
        saved.id,
        branchId,
        tenantId,
        total,
        clientData ?? {},
        xmlKey,
        pdfKey,
      ),
    );

    return saved;
  }

  async findAll(
    user: UserPayload,
    filters: FilterCfdiDto,
  ): Promise<{
    data: CfdiLog[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.cfdiLogRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.branchId) {
      qb.andWhere('c.branch_id = :branchId', { branchId: filters.branchId });
    }
    if (filters.tipo) {
      qb.andWhere('c.cfdi_type = :tipo', { tipo: filters.tipo });
    }
    if (filters.status) {
      qb.andWhere('c.status = :status', { status: filters.status });
    }
    if (filters.fechaDesde) {
      qb.andWhere('c.created_at >= :fechaDesde', {
        fechaDesde: filters.fechaDesde,
      });
    }
    if (filters.fechaHasta) {
      qb.andWhere('c.created_at <= :fechaHasta', {
        fechaHasta: `${filters.fechaHasta}T23:59:59.999Z`,
      });
    }
    if (filters.referenceId) {
      qb.andWhere('c.reference_id = :referenceId', {
        referenceId: filters.referenceId,
      });
    }

    const [data, total] = await qb
      .orderBy('c.created_at', 'DESC')
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

  async findOne(
    user: UserPayload,
    id: string,
  ): Promise<CfdiLog & { xmlUrl?: string; pdfUrl?: string }> {
    const qb = this.cfdiLogRepo
      .createQueryBuilder('c')
      .where('c.id = :id', { id })
      .andWhere('c.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    const cfdi = await qb.getOne();
    if (!cfdi) {
      throw new NotFoundException('CFDI no encontrado');
    }

    const xmlUrl = await this.storage.getSignedUrl(cfdi.xmlKey, 3600);
    const pdfUrl = await this.storage.getSignedUrl(cfdi.pdfKey, 3600);

    return { ...cfdi, xmlUrl, pdfUrl };
  }

  async cancel(
    user: UserPayload,
    id: string,
    dto: CancelCfdiDto,
  ): Promise<CfdiLog> {
    const cfdi = await this.cfdiLogRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!cfdi) throw new NotFoundException('CFDI no encontrado');
    if (cfdi.status === CfdiStatusEnum.CANCELLED) {
      throw new BadRequestException('El CFDI ya está cancelado');
    }

    const invoiceId = cfdi.facturaapiInvoiceId ?? cfdi.satUuid;
    const apiKey = await this.getApiKey(cfdi.branchId);
    const client = new CfdiFacturapiClient(apiKey);

    await client.cancel(
      invoiceId,
      dto.motivoCancelacion,
      dto.cfdiSustitucionId ?? undefined,
    );

    cfdi.status = CfdiStatusEnum.CANCELLED;
    cfdi.cancellationReason = dto.motivoCancelacion;
    cfdi.cancelledById = user.sub;
    cfdi.cancelledAt = new Date();
    return this.cfdiLogRepo.save(cfdi);
  }

  async registerPago(
    user: UserPayload,
    cfdiLogId: string,
    dto: RegisterPagoDto,
  ): Promise<{ message: string; uuid?: string }> {
    const cfdi = await this.cfdiLogRepo.findOne({
      where: { id: cfdiLogId, tenantId: user.tenantId },
    });
    if (!cfdi) throw new NotFoundException('CFDI no encontrado');
    if (cfdi.status === CfdiStatusEnum.CANCELLED) {
      throw new BadRequestException(
        'No se puede registrar pago en CFDI cancelado',
      );
    }

    const branchEntity = await this.branchRepo.findOne({
      where: { id: cfdi.branchId },
    });
    if (!branchEntity) throw new NotFoundException('Sucursal no encontrada');

    let clientEntity: Client | null = null;
    if (cfdi.referenceType === 'Sale') {
      const sale = await this.saleRepo.findOne({
        where: { id: cfdi.referenceId },
        relations: ['client'],
      });
      clientEntity = sale?.client ?? null;
    } else if (cfdi.referenceType === 'ServiceOrder') {
      const so = await this.soRepo.findOne({
        where: { id: cfdi.referenceId },
        relations: ['owner'],
      });
      clientEntity = so?.owner ?? null;
    } else if (cfdi.referenceType === 'UnitSale') {
      const us = await this.unitSaleRepo.findOne({
        where: { id: cfdi.referenceId },
        relations: ['client'],
      });
      clientEntity = us?.client ?? null;
    }

    const customer = this.buildCustomerFromClient(clientEntity, branchEntity);
    const apiKey = await this.getApiKey(cfdi.branchId);
    const client = new CfdiFacturapiClient(apiKey);

    const amount = Number(dto.amount);
    const base = Math.round((amount / 1.16) * 100) / 100;

    const paymentForm =
      dto.paymentMethod.length === 2
        ? dto.paymentMethod
        : this.mapPaymentMethodToSat(dto.paymentMethod);

    const payload: FacturapiPaymentComplementPayload = {
      type: 'P',
      customer,
      complements: [
        {
          type: 'pago',
          data: [
            {
              payment_form: paymentForm,
              related_documents: [
                {
                  uuid: cfdi.satUuid,
                  amount,
                  installment: 1,
                  last_balance: amount,
                  taxes: [{ base, type: 'IVA', rate: 0.16 }],
                },
              ],
            },
          ],
        },
      ],
    };

    const invoice = await client.createPaymentComplement(payload);
    const uuid = (invoice as { uuid?: string }).uuid ?? invoice.id;

    return {
      message: 'Complemento de pago registrado correctamente',
      uuid,
    };
  }

  private mapPaymentMethodToSat(method: string): string {
    const map: Record<string, string> = {
      efectivo: '01',
      cheque: '02',
      transferencia: '03',
      tarjeta: '04',
      credito: '28',
    };
    return map[method.toLowerCase()] ?? '99';
  }

  async resend(user: UserPayload, id: string): Promise<{ message: string }> {
    const cfdi = await this.cfdiLogRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!cfdi) throw new NotFoundException('CFDI no encontrado');

    this.eventEmitter.emit(
      'cfdi.generado',
      new CfdiGeneradoEvent(
        cfdi.id,
        cfdi.branchId,
        cfdi.tenantId,
        Number(cfdi.total),
        {},
        cfdi.xmlKey,
        cfdi.pdfKey,
      ),
    );

    return { message: 'Reenvío de notificación programado' };
  }
}
