import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  SalesAppointment,
  SalesAppointmentStatusEnum,
} from './entities/sales-appointment.entity';
import {
  CreateSalesAppointmentDto,
  UpdateSalesAppointmentStatusDto,
} from './dto/sales-appointment.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class SalesAppointmentsService {
  constructor(
    @InjectRepository(SalesAppointment)
    private readonly repo: Repository<SalesAppointment>,
  ) {}

  async findAll(
    user: UserPayload,
    filters: { from?: string; to?: string; status?: string } = {},
  ) {
    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.from && filters.to) {
      where.scheduledAt = Between(
        new Date(filters.from),
        new Date(filters.to),
      );
    }
    return this.repo.find({ where, order: { scheduledAt: 'ASC' } });
  }

  async findOne(user: UserPayload, id: string): Promise<SalesAppointment> {
    const cita = await this.repo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!cita) throw new NotFoundException(`Cita ${id} no encontrada`);
    return cita;
  }

  async create(
    user: UserPayload,
    dto: CreateSalesAppointmentDto,
  ): Promise<SalesAppointment> {
    const branchId = dto.branchId ?? user.branchId;
    if (!branchId) {
      throw new BadRequestException('Se requiere sucursal para la cita');
    }
    const cita = this.repo.create({
      tenantId: user.tenantId,
      branchId,
      clientId: dto.clientId ?? null,
      clientName: dto.clientName,
      clientPhone: dto.clientPhone ?? null,
      sellerId: dto.sellerId ?? null,
      catalogUnitId: dto.catalogUnitId ?? null,
      unitLabel: dto.unitLabel ?? null,
      purpose: dto.purpose,
      status: SalesAppointmentStatusEnum.SCHEDULED,
      scheduledAt: new Date(dto.scheduledAt),
      durationMin: dto.durationMin ?? 60,
      notes: dto.notes ?? null,
      createdBy: user.sub,
    });
    return this.repo.save(cita);
  }

  async updateStatus(
    user: UserPayload,
    id: string,
    dto: UpdateSalesAppointmentStatusDto,
  ): Promise<SalesAppointment> {
    const cita = await this.findOne(user, id);
    cita.status = dto.status;
    return this.repo.save(cita);
  }
}
