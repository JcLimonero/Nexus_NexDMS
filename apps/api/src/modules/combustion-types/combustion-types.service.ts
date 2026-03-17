import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CombustionType } from './entities/combustion-type.entity';

@Injectable()
export class CombustionTypesService {
  constructor(
    @InjectRepository(CombustionType)
    private readonly repo: Repository<CombustionType>,
  ) {}

  async findAll(): Promise<CombustionType[]> {
    return this.repo.find({
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
  }
}
