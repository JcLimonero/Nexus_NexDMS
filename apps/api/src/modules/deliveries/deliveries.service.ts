import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CODIGO_OBJETO,
  siguienteCodigoDocumento,
} from '../../common/codigos/document-code.util';
import {
  ChecklistItem,
  Delivery,
  DeliveryKindEnum,
} from './entities/delivery.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

/** Puntos por defecto del acta según el área. */
const PLANTILLAS: Record<DeliveryKindEnum, string[]> = {
  [DeliveryKindEnum.UNIT_SALE]: [
    'Factura entregada',
    'Contrato firmado',
    'Placas / engomado / tarjeta',
    'Manual y póliza de garantía',
    'Juego de llaves completo',
    'Nivel de combustible acordado',
    'Accesorios entregados',
    'Unidad limpia y revisada',
  ],
  [DeliveryKindEnum.SERVICE]: [
    'Trabajos realizados explicados al cliente',
    'Refacciones cambiadas mostradas',
    'Prueba de manejo / funcionamiento',
    'Sin pendientes ni observaciones',
    'Vehículo limpio',
    'Conformidad del cliente',
  ],
};

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery)
    private readonly repo: Repository<Delivery>,
  ) {}

  /** Plantilla de checklist por tipo (para prellenar el formulario). */
  plantilla(kind: DeliveryKindEnum): ChecklistItem[] {
    return (PLANTILLAS[kind] ?? []).map((label) => ({ label, done: false }));
  }

  async findAll(user: UserPayload, kind?: DeliveryKindEnum) {
    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (kind) where.kind = kind;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(user: UserPayload, id: string): Promise<Delivery> {
    const d = await this.repo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!d) throw new NotFoundException(`Entrega ${id} no encontrada`);
    return d;
  }

  private async generateFolio(tenantId: string): Promise<string> {
    const { codigo } = await siguienteCodigoDocumento(
      this.repo.manager,
      tenantId,
      CODIGO_OBJETO.ENTREGA,
    );
    return codigo;
  }

  async create(user: UserPayload, dto: CreateDeliveryDto): Promise<Delivery> {
    const branchId = dto.branchId ?? user.branchId;
    if (!branchId) {
      throw new BadRequestException('Se requiere sucursal para la entrega');
    }
    const checklist =
      dto.checklist && dto.checklist.length
        ? dto.checklist
        : this.plantilla(dto.kind);

    const folio = await this.generateFolio(user.tenantId);
    const delivery = this.repo.create({
      tenantId: user.tenantId,
      branchId,
      folio,
      kind: dto.kind,
      referenceLabel: dto.referenceLabel ?? null,
      clientId: dto.clientId ?? null,
      checklist,
      notes: dto.notes ?? null,
      deliveredBy: user.sub,
      deliveredAt: new Date(),
    });
    return this.repo.save(delivery);
  }
}
