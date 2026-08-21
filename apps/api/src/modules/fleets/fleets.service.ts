import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { Client } from '../clients/entities/client.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import {
  BasePriceTier,
  PartPriceResolver,
  PricingService,
} from '../price-lists/pricing.service';
import { FleetAgreement } from './entities/fleet-agreement.entity';
import { FleetUnit } from './entities/fleet-unit.entity';

export interface CrearConvenioDto {
  clientId: string;
  agreementNumber: string;
  name: string;
  partsPriceListId?: string | null;
  partsDiscountPct?: number | null;
  laborDiscountPct?: number | null;
  unitSaleDiscountPct?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

export type ActualizarConvenioDto = Partial<Omit<CrearConvenioDto, 'clientId'>>;

/** Descuento resuelto de un convenio para aplicar en un cobro. */
export interface ContextoFlotilla {
  agreement: FleetAgreement;
  partsResolver: PartPriceResolver;
  laborDiscountPct: number;
  unitSaleDiscountPct: number;
}

@Injectable()
export class FleetsService {
  constructor(
    @InjectRepository(FleetAgreement)
    private readonly agreementRepo: Repository<FleetAgreement>,
    @InjectRepository(FleetUnit)
    private readonly unitRepo: Repository<FleetUnit>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(CustomerVehicle)
    private readonly vehicleRepo: Repository<CustomerVehicle>,
    private readonly pricing: PricingService,
  ) {}

  // ─── Resolución de precios (la usan taller, mostrador y venta) ──

  /** Hoy cae dentro de la vigencia del convenio. */
  private vigente(a: FleetAgreement): boolean {
    if (!a.isActive) return false;
    const hoy = new Date().toISOString().slice(0, 10);
    if (a.validFrom && hoy < a.validFrom) return false;
    if (a.validTo && hoy > a.validTo) return false;
    return true;
  }

  /** Convenio activo y vigente al que está adscrita una unidad, si hay. */
  async convenioDeVehiculo(
    tenantId: string,
    vehicleId: string | null | undefined,
  ): Promise<FleetAgreement | null> {
    if (!vehicleId) return null;
    const units = await this.unitRepo.find({ where: { tenantId, vehicleId } });
    if (!units.length) return null;
    const agreements = await this.agreementRepo.find({
      where: { tenantId, id: In(units.map((u) => u.fleetAgreementId)) },
    });
    return agreements.find((a) => this.vigente(a)) ?? null;
  }

  /** Convenio activo y vigente de una empresa (para mostrador y venta). */
  async convenioDeCliente(
    tenantId: string,
    clientId: string | null | undefined,
  ): Promise<FleetAgreement | null> {
    if (!clientId) return null;
    const agreements = await this.agreementRepo.find({
      where: { tenantId, clientId },
      order: { createdAt: 'DESC' },
    });
    return agreements.find((a) => this.vigente(a)) ?? null;
  }

  private async contexto(
    tenantId: string,
    agreement: FleetAgreement | null,
    tier: BasePriceTier,
  ): Promise<ContextoFlotilla | null> {
    if (!agreement) return null;
    const partsResolver = await this.pricing.buildResolver(tenantId, {
      priceListId: agreement.partsPriceListId,
      discountPct: agreement.partsDiscountPct ?? 0,
      fallbackTier: tier,
    });
    return {
      agreement,
      partsResolver,
      laborDiscountPct: agreement.laborDiscountPct ?? 0,
      unitSaleDiscountPct: agreement.unitSaleDiscountPct ?? 0,
    };
  }

  /** Contexto de descuento para el vehículo de una orden de taller. */
  async contextoVehiculo(
    tenantId: string,
    vehicleId: string | null | undefined,
    tier: BasePriceTier = BasePriceTier.PUBLIC,
  ): Promise<ContextoFlotilla | null> {
    return this.contexto(
      tenantId,
      await this.convenioDeVehiculo(tenantId, vehicleId),
      tier,
    );
  }

  /** Contexto de descuento para un cliente (mostrador, venta de unidad). */
  async contextoCliente(
    tenantId: string,
    clientId: string | null | undefined,
    tier: BasePriceTier = BasePriceTier.PUBLIC,
  ): Promise<ContextoFlotilla | null> {
    return this.contexto(
      tenantId,
      await this.convenioDeCliente(tenantId, clientId),
      tier,
    );
  }

  // ─── CRUD de convenios ──────────────────────────────────────

  private nombreCliente(c: Client | undefined): string {
    if (!c) return '';
    return c.isCompany || c.companyName
      ? (c.companyName ?? '')
      : [c.firstName, c.lastName].filter(Boolean).join(' ');
  }

  async listar(
    user: UserPayload,
  ): Promise<(FleetAgreement & { clienteNombre: string; unidades: number })[]> {
    const agreements = await this.agreementRepo.find({
      where: { tenantId: user.tenantId },
      order: { createdAt: 'DESC' },
    });
    const salida: (FleetAgreement & {
      clienteNombre: string;
      unidades: number;
    })[] = [];
    for (const a of agreements) {
      const [cliente, unidades] = await Promise.all([
        this.clientRepo.findOne({ where: { id: a.clientId } }),
        this.unitRepo.count({ where: { fleetAgreementId: a.id } }),
      ]);
      salida.push({
        ...a,
        clienteNombre: this.nombreCliente(cliente ?? undefined),
        unidades,
      });
    }
    return salida;
  }

  private async convenio(
    user: UserPayload,
    id: string,
  ): Promise<FleetAgreement> {
    const a = await this.agreementRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!a) throw new NotFoundException('Convenio de flotilla no encontrado.');
    return a;
  }

  async crear(
    user: UserPayload,
    dto: CrearConvenioDto,
  ): Promise<FleetAgreement> {
    if (!dto.agreementNumber?.trim() || !dto.name?.trim()) {
      throw new BadRequestException('Faltan número de convenio y nombre.');
    }
    const cliente = await this.clientRepo.findOne({
      where: { id: dto.clientId, tenantId: user.tenantId },
    });
    if (!cliente) throw new BadRequestException('El cliente no existe.');
    const dup = await this.agreementRepo.findOne({
      where: {
        tenantId: user.tenantId,
        agreementNumber: dto.agreementNumber.trim(),
      },
    });
    if (dup) {
      throw new BadRequestException('Ya existe un convenio con ese número.');
    }
    return this.agreementRepo.save(
      this.agreementRepo.create({
        tenantId: user.tenantId,
        clientId: dto.clientId,
        agreementNumber: dto.agreementNumber.trim(),
        name: dto.name.trim(),
        partsPriceListId: dto.partsPriceListId ?? null,
        partsDiscountPct: dto.partsDiscountPct ?? null,
        laborDiscountPct: dto.laborDiscountPct ?? null,
        unitSaleDiscountPct: dto.unitSaleDiscountPct ?? null,
        validFrom: dto.validFrom ?? null,
        validTo: dto.validTo ?? null,
        isActive: dto.isActive ?? true,
        notes: dto.notes ?? null,
      }),
    );
  }

  async detalle(user: UserPayload, id: string) {
    const agreement = await this.convenio(user, id);
    const [cliente, units] = await Promise.all([
      this.clientRepo.findOne({ where: { id: agreement.clientId } }),
      this.unitRepo.find({ where: { fleetAgreementId: id } }),
    ]);
    const vehiculos = await this.vehicleRepo.find({
      where: { id: In(units.length ? units.map((u) => u.vehicleId) : ['-']) },
    });
    const vMap = new Map(vehiculos.map((v) => [v.id, v]));
    return {
      ...agreement,
      clienteNombre: this.nombreCliente(cliente ?? undefined),
      vigente: this.vigente(agreement),
      unidades: units.map((u) => {
        const v = vMap.get(u.vehicleId);
        return {
          unitId: u.id,
          vehicleId: u.vehicleId,
          plate: v?.plate ?? null,
          make: v?.make ?? null,
          model: v?.model ?? null,
          year: v?.year ?? null,
        };
      }),
    };
  }

  async actualizar(
    user: UserPayload,
    id: string,
    dto: ActualizarConvenioDto,
  ): Promise<FleetAgreement> {
    const a = await this.convenio(user, id);
    if (dto.agreementNumber && dto.agreementNumber.trim() !== a.agreementNumber) {
      const dup = await this.agreementRepo.findOne({
        where: {
          tenantId: user.tenantId,
          agreementNumber: dto.agreementNumber.trim(),
        },
      });
      if (dup) throw new BadRequestException('Ya existe ese número de convenio.');
    }
    Object.assign(a, {
      agreementNumber: dto.agreementNumber?.trim() ?? a.agreementNumber,
      name: dto.name?.trim() ?? a.name,
      partsPriceListId:
        dto.partsPriceListId !== undefined
          ? dto.partsPriceListId
          : a.partsPriceListId,
      partsDiscountPct:
        dto.partsDiscountPct !== undefined
          ? dto.partsDiscountPct
          : a.partsDiscountPct,
      laborDiscountPct:
        dto.laborDiscountPct !== undefined
          ? dto.laborDiscountPct
          : a.laborDiscountPct,
      unitSaleDiscountPct:
        dto.unitSaleDiscountPct !== undefined
          ? dto.unitSaleDiscountPct
          : a.unitSaleDiscountPct,
      validFrom: dto.validFrom !== undefined ? dto.validFrom : a.validFrom,
      validTo: dto.validTo !== undefined ? dto.validTo : a.validTo,
      isActive: dto.isActive ?? a.isActive,
      notes: dto.notes !== undefined ? dto.notes : a.notes,
    });
    return this.agreementRepo.save(a);
  }

  async eliminar(user: UserPayload, id: string): Promise<void> {
    const a = await this.convenio(user, id);
    await this.agreementRepo.remove(a);
  }

  // ─── Unidades adscritas ─────────────────────────────────────

  /** Vehículos del titular que aún no están en el convenio (para elegir). */
  async unidadesDisponibles(
    user: UserPayload,
    id: string,
  ): Promise<CustomerVehicle[]> {
    const a = await this.convenio(user, id);
    const [delCliente, yaEn] = await Promise.all([
      this.vehicleRepo.find({ where: { ownerId: a.clientId } }),
      this.unitRepo.find({ where: { fleetAgreementId: id } }),
    ]);
    const adscritos = new Set(yaEn.map((u) => u.vehicleId));
    return delCliente.filter((v) => !adscritos.has(v.id));
  }

  async agregarUnidad(
    user: UserPayload,
    id: string,
    vehicleId: string,
  ): Promise<FleetUnit> {
    const a = await this.convenio(user, id);
    const vehiculo = await this.vehicleRepo.findOne({ where: { id: vehicleId } });
    if (!vehiculo) throw new NotFoundException('Unidad no encontrada.');
    if (vehiculo.ownerId !== a.clientId) {
      throw new BadRequestException(
        'La unidad no pertenece a la empresa del convenio.',
      );
    }
    const ya = await this.unitRepo.findOne({
      where: { fleetAgreementId: id, vehicleId },
    });
    if (ya) return ya;
    // Una unidad no puede estar en dos convenios activos a la vez.
    const otro = await this.convenioDeVehiculo(user.tenantId, vehicleId);
    if (otro && otro.id !== id) {
      throw new BadRequestException(
        'La unidad ya está en otro convenio activo.',
      );
    }
    return this.unitRepo.save(
      this.unitRepo.create({
        tenantId: user.tenantId,
        fleetAgreementId: id,
        vehicleId,
      }),
    );
  }

  async quitarUnidad(user: UserPayload, unitId: string): Promise<void> {
    const u = await this.unitRepo.findOne({
      where: { id: unitId, tenantId: user.tenantId },
    });
    if (!u) throw new NotFoundException('Unidad del convenio no encontrada.');
    await this.unitRepo.remove(u);
  }
}
