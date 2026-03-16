import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerVehicle } from './entities/customer-vehicle.entity';
import { Client } from '../clients/entities/client.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { CreateCustomerVehicleDto } from './dto/create-customer-vehicle.dto';
import { UpdateCustomerVehicleDto } from './dto/update-customer-vehicle.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ServiceOrderStatusEnum } from '../service-orders/entities/service-order.entity';

@Injectable()
export class CustomerVehiclesService {
  constructor(
    @InjectRepository(CustomerVehicle)
    private readonly vehicleRepo: Repository<CustomerVehicle>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ServiceOrder)
    private readonly serviceOrderRepo: Repository<ServiceOrder>,
  ) {}

  async findAllByClient(
    user: UserPayload,
    clientId: string,
  ): Promise<CustomerVehicle[]> {
    await this.assertClientExists(user, clientId);
    return this.vehicleRepo.find({
      where: { ownerId: clientId, tenantId: user.tenantId },
      order: { year: 'DESC', make: 'ASC' },
    });
  }

  async create(
    user: UserPayload,
    clientId: string,
    dto: CreateCustomerVehicleDto,
  ): Promise<CustomerVehicle> {
    await this.assertClientExists(user, clientId);
    const vehicle = this.vehicleRepo.create({
      ...dto,
      ownerId: clientId,
      tenantId: user.tenantId,
      mileage: dto.mileage ?? 0,
      insuranceCompany: dto.insuranceCompany ?? null,
      insurancePolicyNumber: dto.insurancePolicyNumber ?? null,
      insuranceExpirationDate: dto.insuranceExpirationDate
        ? new Date(dto.insuranceExpirationDate)
        : null,
    });
    return this.vehicleRepo.save(vehicle);
  }

  async update(
    user: UserPayload,
    clientId: string,
    vehicleId: string,
    dto: UpdateCustomerVehicleDto,
  ): Promise<CustomerVehicle> {
    const vehicle = await this.findOne(user, clientId, vehicleId);
    const updates = { ...dto };
    if (dto.insuranceExpirationDate !== undefined) {
      (updates as Record<string, unknown>).insuranceExpirationDate =
        dto.insuranceExpirationDate
          ? new Date(dto.insuranceExpirationDate)
          : null;
    }
    Object.assign(vehicle, updates);
    return this.vehicleRepo.save(vehicle);
  }

  async findOne(
    user: UserPayload,
    clientId: string,
    vehicleId: string,
  ): Promise<CustomerVehicle> {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId, ownerId: clientId, tenantId: user.tenantId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo ${vehicleId} no encontrado`);
    }
    return vehicle;
  }

  async getServiceHistory(
    user: UserPayload,
    clientId: string,
    vehicleId: string,
  ): Promise<
    Array<{
      id: string;
      folio: string;
      status: ServiceOrderStatusEnum;
      reportedFailure: string;
      total: number;
      createdAt: Date;
    }>
  > {
    await this.findOne(user, clientId, vehicleId);
    const orders = await this.serviceOrderRepo.find({
      where: {
        vehicleId,
        tenantId: user.tenantId,
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return orders.map((o) => ({
      id: o.id,
      folio: o.folio,
      status: o.status,
      reportedFailure: o.reportedFault,
      total: Number(o.total),
      createdAt: o.createdAt,
    }));
  }

  private async assertClientExists(
    user: UserPayload,
    clientId: string,
  ): Promise<void> {
    const client = await this.clientRepo.findOne({
      where: { id: clientId, tenantId: user.tenantId },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${clientId} no encontrado`);
    }
  }
}
