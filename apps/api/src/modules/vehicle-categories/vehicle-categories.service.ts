import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleCategory } from './entities/vehicle-category.entity';

@Injectable()
export class VehicleCategoriesService {
  constructor(
    @InjectRepository(VehicleCategory)
    private readonly repo: Repository<VehicleCategory>,
  ) {}

  async findAll(): Promise<VehicleCategory[]> {
    return this.repo.find({
      order: { label: 'ASC' },
    });
  }

  async findByCode(code: string): Promise<VehicleCategory | null> {
    return this.repo.findOne({ where: { code } });
  }
}
