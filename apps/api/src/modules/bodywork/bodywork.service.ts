import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { StorageService } from '../../common/storage/storage.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { BodyworkPart } from './entities/bodywork-part.entity';
import {
  BodyworkOrder,
  BodyworkPaymentTypeEnum,
  BodyworkStatusEnum,
} from './entities/bodywork-order.entity';
import {
  BodyworkItem,
  BodyworkItemStatusEnum,
  BodyworkOperationEnum,
} from './entities/bodywork-item.entity';
import { BodyworkPhoto } from './entities/bodywork-photo.entity';

export interface CrearOrdenDto {
  clientId?: string | null;
  clientName: string;
  clientPhone?: string | null;
  vehiclePlate?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | null;
  vehicleColor?: string | null;
  vehicleVin?: string | null;
  paymentType?: BodyworkPaymentTypeEnum;
  insuranceCompany?: string | null;
  policyNumber?: string | null;
  claimNumber?: string | null;
  deductible?: number | null;
  adjuster?: string | null;
  claimDate?: string | null;
  kmIn?: number | null;
  fuelLevel?: string | null;
  damageDescription?: string | null;
  observations?: string | null;
  assignedTo?: string | null;
}

export interface ActualizarOrdenDto extends Partial<CrearOrdenDto> {
  status?: BodyworkStatusEnum;
}

export interface ItemDto {
  bodyworkPartId?: string | null;
  partName: string;
  operation: BodyworkOperationEnum;
  quantity?: number;
  laborPrice?: number;
  materialPrice?: number;
  partPrice?: number;
  status?: BodyworkItemStatusEnum;
  note?: string | null;
}

export interface PiezaDto {
  code: string;
  name: string;
  zone?: string;
  defaultPrice?: number;
  isActive?: boolean;
  sortOrder?: number;
}

const OPERACIONES = new Set(Object.values(BodyworkOperationEnum));

/**
 * Hojalatería y Pintura: recepción de carrocería, presupuesto por pieza y la
 * orden de trabajo con su flujo simple. Todo va con alcance de tenant.
 */
@Injectable()
export class BodyworkService {
  constructor(
    @InjectRepository(BodyworkOrder)
    private readonly orderRepo: Repository<BodyworkOrder>,
    @InjectRepository(BodyworkItem)
    private readonly itemRepo: Repository<BodyworkItem>,
    @InjectRepository(BodyworkPhoto)
    private readonly photoRepo: Repository<BodyworkPhoto>,
    @InjectRepository(BodyworkPart)
    private readonly partRepo: Repository<BodyworkPart>,
    private readonly storage: StorageService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Órdenes ────────────────────────────────────────────────

  async listar(
    user: UserPayload,
    status?: BodyworkStatusEnum,
  ): Promise<BodyworkOrder[]> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.tenant_id = :t', { t: user.tenantId })
      .orderBy('o.created_at', 'DESC');
    if (status) qb.andWhere('o.status = :s', { s: status });
    return qb.getMany();
  }

  private async siguienteFolio(tenantId: string): Promise<number> {
    const year = new Date().getFullYear();
    const r = await this.dataSource.query<{ last_value: number }[]>(
      `INSERT INTO bodywork_folio_seq (tenant_id, year, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, year) DO UPDATE
         SET last_value = bodywork_folio_seq.last_value + 1
       RETURNING last_value`,
      [tenantId, year],
    );
    return r[0]?.last_value ?? 1;
  }

  async crear(user: UserPayload, dto: CrearOrdenDto): Promise<BodyworkOrder> {
    if (!dto.clientName?.trim()) {
      throw new BadRequestException('El nombre del cliente es obligatorio.');
    }
    const folio = await this.siguienteFolio(user.tenantId);
    const orden = this.orderRepo.create({
      tenantId: user.tenantId,
      branchId: user.branchId || null,
      folio,
      status: BodyworkStatusEnum.RECEIVED,
      clientId: dto.clientId ?? null,
      clientName: dto.clientName.trim(),
      clientPhone: dto.clientPhone ?? null,
      vehiclePlate: dto.vehiclePlate ?? null,
      vehicleBrand: dto.vehicleBrand ?? null,
      vehicleModel: dto.vehicleModel ?? null,
      vehicleYear: dto.vehicleYear ?? null,
      vehicleColor: dto.vehicleColor ?? null,
      vehicleVin: dto.vehicleVin ?? null,
      paymentType: dto.paymentType ?? BodyworkPaymentTypeEnum.PARTICULAR,
      insuranceCompany: dto.insuranceCompany ?? null,
      policyNumber: dto.policyNumber ?? null,
      claimNumber: dto.claimNumber ?? null,
      deductible: dto.deductible ?? null,
      adjuster: dto.adjuster ?? null,
      claimDate: dto.claimDate ?? null,
      kmIn: dto.kmIn ?? null,
      fuelLevel: dto.fuelLevel ?? null,
      damageDescription: dto.damageDescription ?? null,
      observations: dto.observations ?? null,
      assignedTo: dto.assignedTo ?? null,
      receivedAt: new Date(),
    });
    return this.orderRepo.save(orden);
  }

  private async orden(user: UserPayload, id: string): Promise<BodyworkOrder> {
    const o = await this.orderRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!o) throw new NotFoundException('Orden de carrocería no encontrada.');
    return o;
  }

  async detalle(user: UserPayload, id: string) {
    const orden = await this.orden(user, id);
    const [items, fotos] = await Promise.all([
      this.itemRepo.find({
        where: { orderId: id },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      }),
      this.photoRepo.find({
        where: { orderId: id },
        order: { createdAt: 'ASC' },
      }),
    ]);
    const fotosConUrl = await Promise.all(
      fotos.map(async (f) => ({
        id: f.id,
        itemId: f.itemId,
        caption: f.caption,
        url: await this.ligaFoto(f.storageKey),
      })),
    );
    return { ...orden, items, photos: fotosConUrl };
  }

  private async ligaFoto(key: string): Promise<string | null> {
    try {
      return await this.storage.getSignedUrl(key);
    } catch {
      return null;
    }
  }

  async actualizar(
    user: UserPayload,
    id: string,
    dto: ActualizarOrdenDto,
  ): Promise<BodyworkOrder> {
    const orden = await this.orden(user, id);
    const campos: (keyof ActualizarOrdenDto)[] = [
      'clientId', 'clientName', 'clientPhone', 'vehiclePlate', 'vehicleBrand',
      'vehicleModel', 'vehicleYear', 'vehicleColor', 'vehicleVin',
      'paymentType', 'insuranceCompany', 'policyNumber', 'claimNumber',
      'deductible', 'adjuster', 'claimDate', 'kmIn', 'fuelLevel',
      'damageDescription', 'observations', 'assignedTo',
    ];
    const destino = orden as unknown as Record<string, unknown>;
    for (const c of campos) {
      if (dto[c] !== undefined) destino[c] = dto[c];
    }
    if (dto.status && dto.status !== orden.status) {
      orden.status = dto.status;
      // La fecha de entrega la pone el sistema al marcar entregada.
      orden.deliveredAt =
        dto.status === BodyworkStatusEnum.DELIVERED ? new Date() : null;
    }
    return this.orderRepo.save(orden);
  }

  async eliminar(user: UserPayload, id: string): Promise<void> {
    const orden = await this.orden(user, id);
    await this.orderRepo.remove(orden);
  }

  // ─── Partidas (presupuesto por pieza) ───────────────────────

  private calcularSubtotal(i: {
    quantity: number;
    laborPrice: number;
    materialPrice: number;
    partPrice: number;
  }): number {
    const q = i.quantity > 0 ? i.quantity : 1;
    return (
      Math.round((i.laborPrice + i.materialPrice + i.partPrice) * q * 100) / 100
    );
  }

  /** Recalcula los totales de la orden a partir de las partidas no rechazadas. */
  private async recalcular(orderId: string): Promise<void> {
    const items = await this.itemRepo.find({ where: { orderId } });
    const vivas = items.filter(
      (i) => i.status !== BodyworkItemStatusEnum.REJECTED,
    );
    const q = (i: BodyworkItem) => (i.quantity > 0 ? i.quantity : 1);
    const labor = vivas.reduce((a, i) => a + i.laborPrice * q(i), 0);
    const material = vivas.reduce((a, i) => a + i.materialPrice * q(i), 0);
    const parts = vivas.reduce((a, i) => a + i.partPrice * q(i), 0);
    await this.orderRepo.update(orderId, {
      laborTotal: Math.round(labor * 100) / 100,
      materialTotal: Math.round(material * 100) / 100,
      partsTotal: Math.round(parts * 100) / 100,
      total: Math.round((labor + material + parts) * 100) / 100,
    });
  }

  async agregarItem(
    user: UserPayload,
    orderId: string,
    dto: ItemDto,
  ): Promise<BodyworkItem> {
    await this.orden(user, orderId);
    if (!dto.partName?.trim()) {
      throw new BadRequestException('Falta el nombre de la pieza.');
    }
    if (!OPERACIONES.has(dto.operation)) {
      throw new BadRequestException('Operación inválida.');
    }
    const cuantos = await this.itemRepo.count({ where: { orderId } });
    const base = {
      tenantId: user.tenantId,
      orderId,
      bodyworkPartId: dto.bodyworkPartId ?? null,
      partName: dto.partName.trim(),
      operation: dto.operation,
      quantity: dto.quantity && dto.quantity > 0 ? dto.quantity : 1,
      laborPrice: dto.laborPrice ?? 0,
      materialPrice: dto.materialPrice ?? 0,
      partPrice: dto.partPrice ?? 0,
      status: dto.status ?? BodyworkItemStatusEnum.PENDING,
      note: dto.note ?? null,
      sortOrder: cuantos,
    };
    const item = this.itemRepo.create({
      ...base,
      subtotal: this.calcularSubtotal(base),
    });
    const guardado = await this.itemRepo.save(item);
    await this.recalcular(orderId);
    return guardado;
  }

  async actualizarItem(
    user: UserPayload,
    itemId: string,
    dto: Partial<ItemDto>,
  ): Promise<BodyworkItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, tenantId: user.tenantId },
    });
    if (!item) throw new NotFoundException('Partida no encontrada.');
    if (dto.operation && !OPERACIONES.has(dto.operation)) {
      throw new BadRequestException('Operación inválida.');
    }
    Object.assign(item, {
      bodyworkPartId:
        dto.bodyworkPartId !== undefined ? dto.bodyworkPartId : item.bodyworkPartId,
      partName: dto.partName?.trim() ?? item.partName,
      operation: dto.operation ?? item.operation,
      quantity:
        dto.quantity !== undefined && dto.quantity > 0
          ? dto.quantity
          : item.quantity,
      laborPrice: dto.laborPrice ?? item.laborPrice,
      materialPrice: dto.materialPrice ?? item.materialPrice,
      partPrice: dto.partPrice ?? item.partPrice,
      status: dto.status ?? item.status,
      note: dto.note !== undefined ? dto.note : item.note,
    });
    item.subtotal = this.calcularSubtotal(item);
    const guardado = await this.itemRepo.save(item);
    await this.recalcular(item.orderId);
    return guardado;
  }

  async eliminarItem(user: UserPayload, itemId: string): Promise<void> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, tenantId: user.tenantId },
    });
    if (!item) throw new NotFoundException('Partida no encontrada.');
    const orderId = item.orderId;
    await this.itemRepo.remove(item);
    await this.recalcular(orderId);
  }

  // ─── Fotos ──────────────────────────────────────────────────

  async subirFoto(
    user: UserPayload,
    orderId: string,
    file: { buffer: Buffer; mimetype: string } | undefined,
    itemId?: string | null,
    caption?: string | null,
  ): Promise<{ id: string; url: string | null }> {
    await this.orden(user, orderId);
    if (!file?.buffer) throw new BadRequestException('No llegó ninguna imagen.');
    const key = `hojalateria/${orderId}/${Date.now()}`;
    await this.storage.upload(file.buffer, key, file.mimetype);
    const foto = await this.photoRepo.save(
      this.photoRepo.create({
        tenantId: user.tenantId,
        orderId,
        itemId: itemId ?? null,
        storageKey: key,
        caption: caption ?? null,
      }),
    );
    return { id: foto.id, url: await this.ligaFoto(key) };
  }

  async eliminarFoto(user: UserPayload, photoId: string): Promise<void> {
    const foto = await this.photoRepo.findOne({
      where: { id: photoId, tenantId: user.tenantId },
    });
    if (!foto) throw new NotFoundException('Foto no encontrada.');
    try {
      await this.storage.delete(foto.storageKey);
    } catch {
      // Si el borrado del archivo falla, igual quitamos el registro.
    }
    await this.photoRepo.remove(foto);
  }

  // ─── Catálogo de piezas de carrocería ───────────────────────

  /** Piezas de fábrica (tenant NULL) + las propias del tenant. */
  async listarCatalogo(user: UserPayload): Promise<BodyworkPart[]> {
    return this.partRepo.find({
      where: [{ tenantId: IsNull() }, { tenantId: user.tenantId }],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async crearPieza(user: UserPayload, dto: PiezaDto): Promise<BodyworkPart> {
    if (!dto.code?.trim() || !dto.name?.trim()) {
      throw new BadRequestException('La pieza necesita código y nombre.');
    }
    return this.partRepo.save(
      this.partRepo.create({
        tenantId: user.tenantId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        zone: (dto.zone as BodyworkPart['zone']) ?? undefined,
        defaultPrice: dto.defaultPrice ?? 0,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 500,
      }),
    );
  }

  private async piezaPropia(
    user: UserPayload,
    id: string,
  ): Promise<BodyworkPart> {
    const p = await this.partRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Pieza no encontrada.');
    // Las de fábrica (tenant NULL) no se tocan: son de todos.
    if (p.tenantId !== user.tenantId) {
      throw new BadRequestException(
        'Las piezas de fábrica no se pueden editar; crea una propia.',
      );
    }
    return p;
  }

  async actualizarPieza(
    user: UserPayload,
    id: string,
    dto: Partial<PiezaDto>,
  ): Promise<BodyworkPart> {
    const p = await this.piezaPropia(user, id);
    Object.assign(p, {
      code: dto.code?.trim() ?? p.code,
      name: dto.name?.trim() ?? p.name,
      zone: (dto.zone as BodyworkPart['zone']) ?? p.zone,
      defaultPrice: dto.defaultPrice ?? p.defaultPrice,
      isActive: dto.isActive ?? p.isActive,
      sortOrder: dto.sortOrder ?? p.sortOrder,
    });
    return this.partRepo.save(p);
  }

  async eliminarPieza(user: UserPayload, id: string): Promise<void> {
    const p = await this.piezaPropia(user, id);
    await this.partRepo.remove(p);
  }
}
