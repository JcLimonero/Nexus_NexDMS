import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleType } from './entities/vehicle-type.entity';

@Injectable()
export class VehicleTypesService {
  constructor(
    @InjectRepository(VehicleType)
    private readonly repo: Repository<VehicleType>,
  ) {}

  async findAll(): Promise<VehicleType[]> {
    return this.repo.find({
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
  }
}
