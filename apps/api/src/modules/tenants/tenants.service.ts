import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async findAll(user: UserPayload): Promise<Tenant[]> {
    return this.tenantRepo.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(user: UserPayload, id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} no encontrado`);
    }
    return tenant;
  }

  async create(user: UserPayload, dto: CreateTenantDto): Promise<Tenant> {
    const tenant = this.tenantRepo.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });
    return this.tenantRepo.save(tenant);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateTenantDto,
  ): Promise<Tenant> {
    const tenant = await this.findOne(user, id);
    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async suspend(user: UserPayload, id: string): Promise<Tenant> {
    const tenant = await this.findOne(user, id);
    tenant.isActive = false;
    return this.tenantRepo.save(tenant);
  }
}
