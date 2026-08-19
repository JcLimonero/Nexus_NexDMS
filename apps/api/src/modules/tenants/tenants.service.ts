import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async findAll(_user: UserPayload): Promise<Tenant[]> {
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

  /** Módulos habilitados; null = todos. */
  async getEnabledModules(
    tenantId: string,
  ): Promise<{ enabledModules: string[] | null }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    }
    return { enabledModules: tenant.enabledModules ?? null };
  }

  /** Flujo de estatus de taller; null = flujo por defecto. */
  async getServiceFlow(
    tenantId: string,
  ): Promise<{ serviceFlow: Record<string, string[]> | null }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    }
    return { serviceFlow: tenant.serviceFlow ?? null };
  }

  async setServiceFlow(
    tenantId: string,
    serviceFlow: Record<string, string[]> | null,
  ): Promise<{ serviceFlow: Record<string, string[]> | null }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    }
    tenant.serviceFlow =
      serviceFlow && Object.keys(serviceFlow).length > 0 ? serviceFlow : null;
    await this.tenantRepo.save(tenant);
    return { serviceFlow: tenant.serviceFlow };
  }

  /** Reglas de "salir con adeudo" (R6); null = sin restricciones extra. */
  async getCreditConfig(
    tenantId: string,
  ): Promise<{ creditConfig: Tenant['creditConfig'] }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    }
    return { creditConfig: tenant.creditConfig ?? null };
  }

  async setCreditConfig(
    tenantId: string,
    creditConfig: Tenant['creditConfig'],
  ): Promise<{ creditConfig: Tenant['creditConfig'] }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    }
    const limpio =
      creditConfig && Object.keys(creditConfig).length > 0 ? creditConfig : null;
    tenant.creditConfig = limpio;
    await this.tenantRepo.save(tenant);
    return { creditConfig: tenant.creditConfig };
  }

  /** Divisa (ISO 4217) del tenant. */
  async getCurrency(tenantId: string): Promise<{ currency: string }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    }
    return { currency: tenant.currency ?? 'MXN' };
  }

  async setCurrency(
    tenantId: string,
    currency: string,
  ): Promise<{ currency: string }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    }
    const code = (currency ?? '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      throw new BadRequestException('Divisa inválida (usa código ISO, ej. MXN)');
    }
    tenant.currency = code;
    await this.tenantRepo.save(tenant);
    return { currency: tenant.currency };
  }

  async setEnabledModules(
    tenantId: string,
    enabledModules: string[] | null,
  ): Promise<{ enabledModules: string[] | null }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    }
    tenant.enabledModules =
      enabledModules && enabledModules.length > 0 ? enabledModules : null;
    await this.tenantRepo.save(tenant);
    return { enabledModules: tenant.enabledModules };
  }
}
