import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FilterClientsDto } from './dto/filter-clients.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import {
  DataQualityScore,
  getLevelFromScore,
} from '../../shared/data-quality/data-quality.types';

const CLIENT_QUALITY_WEIGHTS: Record<string, number> = {
  firstName: 10,
  phone: 10,
  email: 10,
  rfc: 25,
  taxRegime: 10,
  taxPostalCode: 5,
  hasVehicle: 15,
  address: 10,
  curp: 5,
};

const CLIENT_QUALITY_FIELD_LABELS: Record<string, string> = {
  firstName: 'nombre',
  phone: 'teléfono',
  email: 'email',
  rfc: 'RFC',
  taxRegime: 'régimen fiscal',
  taxPostalCode: 'CP fiscal',
  hasVehicle: 'vehículo registrado',
  address: 'dirección',
  curp: 'CURP',
};

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(CustomerVehicle)
    private readonly vehicleRepo: Repository<CustomerVehicle>,
  ) {}

  async findAll(
    user: UserPayload,
    filters: FilterClientsDto,
  ): Promise<{
    data: Client[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.clientRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('c.deleted_at IS NULL');

    if (filters.search?.trim()) {
      const raw = filters.search.trim();
      const term = `%${raw}%`;
      const digitsOnly = raw.replace(/\D/g, '');
      const conditions = [
        'c.first_name ILIKE :term',
        'c.last_name ILIKE :term',
        'c.company_name ILIKE :term',
        "CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) ILIKE :term",
        "CONCAT(COALESCE(c.last_name, ''), ' ', COALESCE(c.first_name, '')) ILIKE :term",
        'c.phone ILIKE :term',
        'COALESCE(c.phone_alt, \'\') ILIKE :term',
        'c.email ILIKE :term',
        'c.rfc ILIKE :term',
      ];
      const params: Record<string, string> = { term };
      if (digitsOnly) {
        conditions.push(
          "REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g') ILIKE :termDigits",
          "REGEXP_REPLACE(COALESCE(c.phone_alt, ''), '[^0-9]', '', 'g') ILIKE :termDigits",
        );
        params.termDigits = `%${digitsOnly}%`;
      }
      qb.andWhere(`(${conditions.join(' OR ')})`, params);
    }
    if (filters.clientType) {
      qb.andWhere('c.client_type = :clientType', {
        clientType: filters.clientType,
      });
    }

    const [clients, total] = await qb
      .orderBy('c.first_name', 'ASC')
      .addOrderBy('c.last_name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const vehicleCounts = await this.getVehicleCountsForClients(
      user.tenantId,
      clients.map((c) => c.id),
    );

    const data = clients.map((client) => ({
      ...client,
      dataQuality: this.computeDataQuality(
        client,
        vehicleCounts[client.id] ?? 0,
      ),
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async getVehicleCountsForClients(
    tenantId: string,
    clientIds: string[],
  ): Promise<Record<string, number>> {
    if (clientIds.length === 0) return {};
    const rows = await this.vehicleRepo
      .createQueryBuilder('v')
      .select('v.owner_id', 'ownerId')
      .addSelect('COUNT(*)', 'count')
      .where('v.owner_id IN (:...ids)', { ids: clientIds })
      .andWhere('v.tenant_id = :tenantId', { tenantId })
      .groupBy('v.owner_id')
      .getRawMany<{ ownerId: string; count: string }>();
    return Object.fromEntries(
      rows.map((r) => [r.ownerId, parseInt(r.count, 10) || 0]),
    );
  }

  private computeDataQuality(
    client: Client,
    vehicleCount: number,
  ): DataQualityScore {
    const missingFields: string[] = [];
    let score = 0;

    const hasName =
      client.firstName?.trim() ||
      client.lastName?.trim() ||
      client.companyName?.trim();
    if (hasName) {
      score += CLIENT_QUALITY_WEIGHTS.firstName;
    } else {
      missingFields.push(CLIENT_QUALITY_FIELD_LABELS.firstName);
    }
    if (client.phone?.trim()) {
      score += CLIENT_QUALITY_WEIGHTS.phone;
    } else {
      missingFields.push(CLIENT_QUALITY_FIELD_LABELS.phone);
    }
    if (client.email?.trim()) {
      score += CLIENT_QUALITY_WEIGHTS.email;
    } else {
      missingFields.push(CLIENT_QUALITY_FIELD_LABELS.email);
    }
    if (client.rfc?.trim()) {
      score += CLIENT_QUALITY_WEIGHTS.rfc;
    } else {
      missingFields.push(CLIENT_QUALITY_FIELD_LABELS.rfc);
    }
    if (client.taxRegime?.trim()) {
      score += CLIENT_QUALITY_WEIGHTS.taxRegime;
    } else {
      missingFields.push(CLIENT_QUALITY_FIELD_LABELS.taxRegime);
    }
    if (client.taxPostalCode?.trim()) {
      score += CLIENT_QUALITY_WEIGHTS.taxPostalCode;
    } else {
      missingFields.push(CLIENT_QUALITY_FIELD_LABELS.taxPostalCode);
    }
    if (vehicleCount > 0) {
      score += CLIENT_QUALITY_WEIGHTS.hasVehicle;
    } else {
      missingFields.push(CLIENT_QUALITY_FIELD_LABELS.hasVehicle);
    }
    if (client.address?.trim()) {
      score += CLIENT_QUALITY_WEIGHTS.address;
    } else {
      missingFields.push(CLIENT_QUALITY_FIELD_LABELS.address);
    }
    if (client.curp?.trim()) {
      score += CLIENT_QUALITY_WEIGHTS.curp;
    } else {
      missingFields.push(CLIENT_QUALITY_FIELD_LABELS.curp);
    }

    return {
      score,
      level: getLevelFromScore(score),
      missingFields,
    };
  }

  async findOne(user: UserPayload, id: string): Promise<Client> {
    const client = await this.clientRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }
    return client;
  }

  async getDataQualityScore(
    user: UserPayload,
    client: Client,
    vehicleCount?: number,
  ): Promise<DataQualityScore> {
    const count =
      vehicleCount ??
      (await this.vehicleRepo.count({
        where: { ownerId: client.id, tenantId: user.tenantId },
      }));
    return this.computeDataQuality(client, count);
  }

  async search(user: UserPayload, q: string, limit = 50): Promise<Client[]> {
    if (!q?.trim()) return [];
    const raw = q.trim();
    const term = `%${raw}%`;
    const digitsOnly = raw.replace(/\D/g, '');
    const conditions = [
      'c.first_name ILIKE :term',
      'c.last_name ILIKE :term',
      'c.company_name ILIKE :term',
      "CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) ILIKE :term",
      "CONCAT(COALESCE(c.last_name, ''), ' ', COALESCE(c.first_name, '')) ILIKE :term",
      'c.phone ILIKE :term',
      'COALESCE(c.phone_alt, \'\') ILIKE :term',
      'c.email ILIKE :term',
      'c.rfc ILIKE :term',
    ];
    const params: Record<string, string> = { term };
    if (digitsOnly) {
      conditions.push(
        "REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g') ILIKE :termDigits",
        "REGEXP_REPLACE(COALESCE(c.phone_alt, ''), '[^0-9]', '', 'g') ILIKE :termDigits",
      );
      params.termDigits = `%${digitsOnly}%`;
    }
    return this.clientRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('c.deleted_at IS NULL')
      .andWhere(`(${conditions.join(' OR ')})`, params)
      .orderBy('c.first_name', 'ASC')
      .addOrderBy('c.last_name', 'ASC')
      .take(limit)
      .getMany();
  }

  async create(user: UserPayload, dto: CreateClientDto): Promise<Client> {
    const client = this.clientRepo.create({
      ...dto,
      tenantId: user.tenantId,
      isCompany: dto.isCompany ?? false,
      fixedDiscount: dto.fixedDiscount ?? 0,
    });
    return this.clientRepo.save(client);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    const client = await this.findOne(user, id);
    Object.assign(client, dto);
    return this.clientRepo.save(client);
  }

  async remove(user: UserPayload, id: string): Promise<void> {
    const client = await this.findOne(user, id);
    await this.clientRepo.softRemove(client);
  }

  async getContactsForClient(
    user: UserPayload,
    clientId: string,
  ): Promise<Contact[]> {
    return this.contactRepo.find({
      where: { clientId, tenantId: user.tenantId },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
  }

  async getVehiclesForClient(
    user: UserPayload,
    clientId: string,
  ): Promise<CustomerVehicle[]> {
    return this.vehicleRepo.find({
      where: { ownerId: clientId, tenantId: user.tenantId },
      order: { year: 'DESC', make: 'ASC' },
    });
  }
}
