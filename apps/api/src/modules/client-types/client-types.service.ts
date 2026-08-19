import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientType } from './entities/client-type.entity';

@Injectable()
export class ClientTypesService {
  constructor(
    @InjectRepository(ClientType)
    private readonly repo: Repository<ClientType>,
  ) {}

  async findAll(): Promise<ClientType[]> {
    return this.repo.find({
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
  }
}
