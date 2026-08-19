import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, In, Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import {
  FindingStatusEnum,
  ServiceOrderFinding,
} from './entities/service-order-finding.entity';
import { ServiceOrder } from './entities/service-order.entity';
import {
  ChargeTypeEnum,
  OperationSourceEnum,
  ServiceOrderOperation,
} from './entities/service-order-operation.entity';
import {
  Quotation,
  QuotationPriceListEnum,
  QuotationStatusEnum,
  QuotationTypeEnum,
} from '../quotations/entities/quotation.entity';
import { QuotationItem } from '../quotations/entities/quotation-item.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';

export interface LineaTrabajoAdicional {
  description: string;
  quantity?: number;
  unitPrice: number;
}

/**
 * Trabajos adicionales detectados durante el servicio.
 *
 * Es el ciclo que le da dinero al taller y tranquilidad al cliente: el
 * técnico encuentra algo, lo graba, el asesor lo cotiza, el cliente lo
 * autoriza desde su teléfono y el trabajo entra a la orden como una
 * operación más — con su tiempo y su cargo, igual que el resto.
 *
 * Sin este ciclo, lo que pasa en la práctica es una llamada telefónica sin
 * evidencia y una discusión al momento de pagar.
 */
@Injectable()
export class AdditionalWorkService {
  private readonly logger = new Logger(AdditionalWorkService.name);

  constructor(
    @InjectRepository(ServiceOrderFinding)
    private readonly findingRepo: Repository<ServiceOrderFinding>,
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(ServiceOrderOperation)
    private readonly opRepo: Repository<ServiceOrderOperation>,
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Hallazgos de la orden con lo que el asesor necesita para decidir:
   * quién lo reportó, qué tan urgente y con qué evidencia.
   */
  async listar(user: UserPayload, serviceOrderId: string) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
    });
    if (!so) throw new NotFoundException('Orden no encontrada');

    const findings = await this.findingRepo.find({
      where: { serviceOrderId },
      order: { createdAt: 'DESC' },
    });
    if (!findings.length) return [];

    const userIds = [...new Set(findings.map((f) => f.userId))];
    const users = await this.userRepo.findBy({ id: In(userIds) });
    const quotationIds = findings
      .map((f) => f.quotationId)
      .filter((v): v is string => !!v);
    const quotations = quotationIds.length
      ? await this.quotationRepo.findBy({ id: In(quotationIds) })
      : [];

    return findings.map((f) => {
      const u = users.find((x) => x.id === f.userId);
      const q = quotations.find((x) => x.id === f.quotationId);
      return {
        id: f.id,
        description: f.description,
        criticality: f.criticality,
        status: f.status,
        estimatedMinutes: f.estimatedMinutes,
        estimatedAmount: Number(f.estimatedAmount),
        mediaType: f.mediaType,
        mediaKey: f.mediaKey,
        createdAt: f.createdAt,
        tecnico: u ? `${u.firstName} ${u.lastName}`.trim() : null,
        cotizacion: q
          ? {
              id: q.id,
              folio: q.folio,
              total: Number(q.total),
              status: q.status,
              clientToken: q.clientToken,
              respondida: q.clientRespondedAt !== null,
            }
          : null,
      };
    });
  }

  /**
   * Cotiza uno o varios hallazgos juntos y le manda el enlace al cliente.
   *
   * Van juntos a propósito: al cliente le molesta menos autorizar una vez
   * tres cosas que recibir tres avisos seguidos del mismo taller.
   */
  async cotizar(
    user: UserPayload,
    serviceOrderId: string,
    dto: {
      findingIds: string[];
      lines: LineaTrabajoAdicional[];
      conditions?: string;
    },
  ) {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
      relations: ['branch'],
    });
    if (!so) throw new NotFoundException('Orden no encontrada');
    if (!dto.findingIds?.length) {
      throw new BadRequestException('Selecciona al menos un hallazgo');
    }
    if (!dto.lines?.length) {
      throw new BadRequestException('La cotización necesita conceptos');
    }

    const findings = await this.findingRepo.findBy({
      id: In(dto.findingIds),
      serviceOrderId,
    });
    if (findings.length !== dto.findingIds.length) {
      throw new BadRequestException('Algún hallazgo no pertenece a esta orden');
    }
    const yaCotizado = findings.find(
      (f) => f.status !== FindingStatusEnum.PENDIENTE,
    );
    if (yaCotizado) {
      throw new BadRequestException(
        `El hallazgo "${yaCotizado.description}" ya fue cotizado`,
      );
    }

    const taxRate = Number(so.branch?.taxRate) || 0.16;
    const items = dto.lines.map((l) => {
      const cantidad = l.quantity ?? 1;
      if (l.unitPrice < 0) {
        throw new BadRequestException('El precio no puede ser negativo');
      }
      return {
        description: l.description,
        quantity: cantidad,
        unitPrice: l.unitPrice,
        subtotal: cantidad * l.unitPrice,
      };
    });
    const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const quotationId = await this.dataSource.transaction(async (em) => {
      const year = new Date().getFullYear();
      const seq = await em.query<{ last_value: number }[]>(
        `INSERT INTO quotation_folio_seq (tenant_id, year, last_value)
         VALUES ($1, $2, 1)
         ON CONFLICT (tenant_id, year) DO UPDATE
           SET last_value = quotation_folio_seq.last_value + 1
         RETURNING last_value`,
        [user.tenantId, year],
      );
      const folio = `COT-${year}-${String(seq[0]?.last_value ?? 1).padStart(4, '0')}`;

      const q = em.create(Quotation, {
        tenantId: user.tenantId,
        branchId: so.branchId,
        clientId: so.ownerId,
        userId: user.sub,
        type: QuotationTypeEnum.SERVICE,
        folio,
        status: QuotationStatusEnum.SENT,
        priceList: QuotationPriceListEnum.PUBLIC,
        subtotal,
        discountPct: 0,
        discountAmount: 0,
        taxAmount,
        total,
        conditions: dto.conditions ?? null,
      } as never);
      const saved = (await em.save(q)) as unknown as Quotation;

      for (const it of items) {
        await em.save(
          em.create(QuotationItem, {
            quotationId: saved.id,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: 0,
            subtotal: it.subtotal,
          } as never),
        );
      }

      // El vínculo va en el hallazgo, no en la orden: `receptionQuotationId`
      // es de la cotización de recepción y no debe pisarse.
      await em.update(
        ServiceOrderFinding,
        { id: In(dto.findingIds) },
        { quotationId: saved.id, status: FindingStatusEnum.COTIZADO },
      );
      return saved.id;
    });

    const quotation = await this.quotationRepo.findOneOrFail({
      where: { id: quotationId },
    });

    const cliente = await this.clientRepo.findOne({
      where: { id: so.ownerId },
    });
    if (cliente?.phone) {
      this.events.emit('recepcion.cotizacion_enviada', {
        serviceOrderId: so.id,
        quotationId: quotation.id,
        folio: quotation.folio,
        total,
        clientToken: quotation.clientToken,
        tenantId: so.tenantId,
        branchId: so.branchId,
        client: { phone: cliente.phone, email: cliente.email ?? undefined },
      });
    } else {
      this.logger.warn(
        `Cotización ${quotation.folio} sin aviso: el cliente no tiene teléfono`,
      );
    }

    return quotation;
  }

  /**
   * Aplica la respuesta del cliente a los hallazgos de esa cotización.
   *
   * No recibe usuario porque la llama el endpoint público del enlace, donde
   * quien responde es el cliente y no hay sesión. Devuelve cuántas
   * operaciones se dieron de alta para poder informarlo.
   */
  async aplicarRespuesta(
    quotationId: string,
    acepta: boolean,
  ): Promise<{ hallazgos: number; operaciones: number }> {
    const findings = await this.findingRepo.findBy({ quotationId });
    if (!findings.length) return { hallazgos: 0, operaciones: 0 };

    await this.findingRepo.update(
      { quotationId },
      {
        status: acepta
          ? FindingStatusEnum.AUTORIZADO
          : FindingStatusEnum.RECHAZADO,
      },
    );
    if (!acepta) return { hallazgos: findings.length, operaciones: 0 };

    // Autorizado: el trabajo entra a la orden como operación, para que el
    // técnico pueda fichar contra él igual que contra el resto.
    const serviceOrderId = findings[0].serviceOrderId;
    const desde = await this.opRepo.count({ where: { serviceOrderId } });
    const nuevas = findings.map((f, i) =>
      this.opRepo.create({
        serviceOrderId,
        description: f.description,
        standardMinutes: f.estimatedMinutes,
        laborPrice: 0,
        chargeType: ChargeTypeEnum.CLIENT,
        source: OperationSourceEnum.FINDING,
        findingId: f.id,
        mechanicId: f.userId,
        sortOrder: desde + i,
      }),
    );
    await this.opRepo.save(nuevas);
    return { hallazgos: findings.length, operaciones: nuevas.length };
  }
}
