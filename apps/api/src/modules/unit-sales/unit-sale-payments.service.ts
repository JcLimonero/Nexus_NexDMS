import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { StorageService } from '../../common/storage/storage.service';
import {
  UnitSalePayment,
  UnitSalePaymentKindEnum,
  UnitSalePaymentMethodEnum,
} from './entities/unit-sale-payment.entity';
import { UnitSale, UnitSaleStatusEnum } from './entities/unit-sale.entity';

export interface RegistrarPagoDto {
  kind: UnitSalePaymentKindEnum;
  amount: number;
  method: UnitSalePaymentMethodEnum;
  reference?: string;
  paidDate: string;
  notes?: string;
}

@Injectable()
export class UnitSalePaymentsService {
  constructor(
    @InjectRepository(UnitSalePayment)
    private readonly payRepo: Repository<UnitSalePayment>,
    @InjectRepository(UnitSale)
    private readonly saleRepo: Repository<UnitSale>,
    private readonly storage: StorageService,
  ) {}

  private async venta(user: UserPayload, unitSaleId: string): Promise<UnitSale> {
    const sale = await this.saleRepo.findOne({
      where: { id: unitSaleId, tenantId: user.tenantId },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  /** Pagos de una venta con su total y qué falta para cerrarla. */
  async listar(user: UserPayload, unitSaleId: string) {
    await this.venta(user, unitSaleId);
    const pagos = await this.payRepo.find({
      where: { unitSaleId },
      order: { paidDate: 'ASC', createdAt: 'ASC' },
    });
    const total = pagos.reduce((a, p) => a + Number(p.amount), 0);
    const sinComprobante = pagos.filter((p) => !p.receiptStorageKey);
    return {
      pagos: pagos.map((p) => ({
        ...p,
        amount: Number(p.amount),
        tieneComprobante: !!p.receiptStorageKey,
      })),
      total,
      // Lo que impide cerrar la venta desde el lado de los pagos.
      pagosSinComprobante: sinComprobante.length,
    };
  }

  async registrar(
    user: UserPayload,
    unitSaleId: string,
    dto: RegistrarPagoDto,
  ) {
    const sale = await this.venta(user, unitSaleId);
    // Una venta cerrada o cancelada no recibe más pagos: su historial queda
    // como quedó.
    if (sale.status !== UnitSaleStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        'Solo se registran pagos en una venta en proceso',
      );
    }
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('El importe debe ser mayor a cero');
    }
    if (!dto.paidDate) {
      throw new BadRequestException('Falta la fecha del pago');
    }
    return this.payRepo.save(
      this.payRepo.create({
        tenantId: user.tenantId,
        unitSaleId,
        kind: dto.kind,
        amount: String(dto.amount),
        method: dto.method,
        reference: dto.reference ?? null,
        paidDate: dto.paidDate,
        notes: dto.notes ?? null,
      }),
    );
  }

  /** Adjunta o reemplaza el comprobante de un pago. */
  async subirComprobante(
    user: UserPayload,
    pagoId: string,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const pago = await this.payRepo.findOne({
      where: { id: pagoId, tenantId: user.tenantId },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');

    const key = await this.storage.upload(
      file.buffer,
      `ventas/${pago.unitSaleId}/pagos/${pago.id}-${Date.now()}`,
      file.mimetype,
    );
    // Reemplazar borra el anterior: un pago tiene un comprobante, no una pila.
    if (pago.receiptStorageKey) {
      await this.storage.delete(pago.receiptStorageKey).catch(() => undefined);
    }
    pago.receiptStorageKey = key;
    pago.receiptName = file.originalname || 'comprobante';
    pago.receiptMime = file.mimetype;
    return this.payRepo.save(pago);
  }

  async ligaComprobante(user: UserPayload, pagoId: string) {
    const pago = await this.payRepo.findOne({
      where: { id: pagoId, tenantId: user.tenantId },
    });
    if (!pago?.receiptStorageKey) {
      throw new NotFoundException('El pago no tiene comprobante');
    }
    return { url: await this.storage.getSignedUrl(pago.receiptStorageKey) };
  }

  async eliminar(user: UserPayload, pagoId: string) {
    const pago = await this.payRepo.findOne({
      where: { id: pagoId, tenantId: user.tenantId },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    const sale = await this.venta(user, pago.unitSaleId);
    if (sale.status !== UnitSaleStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        'No se borran pagos de una venta ya cerrada',
      );
    }
    if (pago.receiptStorageKey) {
      await this.storage.delete(pago.receiptStorageKey).catch(() => undefined);
    }
    await this.payRepo.remove(pago);
    return { ok: true };
  }

  /**
   * Cuántos pagos de una venta no tienen comprobante.
   *
   * Lo usa el cierre de la venta: no se marca como vendida mientras quede un
   * pago sin su recibo guardado.
   */
  async pagosSinComprobante(unitSaleId: string): Promise<number> {
    return this.payRepo.count({
      where: { unitSaleId, receiptStorageKey: IsNull() },
    });
  }
}
