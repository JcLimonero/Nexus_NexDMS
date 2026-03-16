import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import {
  DataQualityScore,
  getLevelFromScore,
} from '../../shared/data-quality/data-quality.types';

const CONTACT_QUALITY_WEIGHTS: Record<string, number> = {
  name: 30,
  phone: 40,
  email: 30,
};

const CONTACT_QUALITY_FIELD_LABELS: Record<string, string> = {
  name: 'nombre',
  phone: 'teléfono',
  email: 'email',
};

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async findAllByClient(
    user: UserPayload,
    clientId: string,
  ): Promise<Contact[]> {
    return this.contactRepo.find({
      where: { clientId, tenantId: user.tenantId },
      order: { name: 'ASC', lastName: 'ASC' },
    });
  }

  async findOne(
    user: UserPayload,
    clientId: string,
    contactId: string,
  ): Promise<Contact> {
    const contact = await this.contactRepo.findOne({
      where: { id: contactId, clientId, tenantId: user.tenantId },
    });
    if (!contact) {
      throw new NotFoundException(`Contacto ${contactId} no encontrado`);
    }
    return contact;
  }

  async getDataQualityScore(
    user: UserPayload,
    contact: Contact,
  ): Promise<DataQualityScore> {
    const missingFields: string[] = [];
    let score = 0;

    if (contact.name?.trim()) {
      score += CONTACT_QUALITY_WEIGHTS.name;
    } else {
      missingFields.push(CONTACT_QUALITY_FIELD_LABELS.name);
    }
    if (contact.phone?.trim()) {
      score += CONTACT_QUALITY_WEIGHTS.phone;
    } else {
      missingFields.push(CONTACT_QUALITY_FIELD_LABELS.phone);
    }
    if (contact.email?.trim()) {
      score += CONTACT_QUALITY_WEIGHTS.email;
    } else {
      missingFields.push(CONTACT_QUALITY_FIELD_LABELS.email);
    }

    return {
      score,
      level: getLevelFromScore(score),
      missingFields,
    };
  }

  async create(
    user: UserPayload,
    clientId: string,
    dto: CreateContactDto,
  ): Promise<Contact> {
    await this.assertClientExists(user, clientId);
    const contact = this.contactRepo.create({
      ...dto,
      clientId,
      tenantId: user.tenantId,
      isAuthorized: dto.isAuthorized ?? true,
    });
    return this.contactRepo.save(contact);
  }

  async update(
    user: UserPayload,
    clientId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.findOne(user, clientId, contactId);
    Object.assign(contact, dto);
    return this.contactRepo.save(contact);
  }

  async remove(
    user: UserPayload,
    clientId: string,
    contactId: string,
  ): Promise<void> {
    const contact = await this.findOne(user, clientId, contactId);
    await this.contactRepo.remove(contact);
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
