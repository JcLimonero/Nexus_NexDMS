import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerVehicle } from './entities/customer-vehicle.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateCustomerVehicleDto } from './dto/create-customer-vehicle.dto';
import { UpdateCustomerVehicleDto } from './dto/update-customer-vehicle.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class CustomerVehiclesService {
  constructor(
    @InjectRepository(CustomerVehicle)
    private readonly vehicleRepo: Repository<CustomerVehicle>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
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
    Object.assign(vehicle, dto);
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
