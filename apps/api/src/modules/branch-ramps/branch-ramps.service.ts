import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchRamp } from './entities/branch-ramp.entity';
import { CreateBranchRampDto } from './dto/create-branch-ramp.dto';
import { UpdateBranchRampDto } from './dto/update-branch-ramp.dto';

@Injectable()
export class BranchRampsService {
  constructor(
    @InjectRepository(BranchRamp)
    private readonly rampRepo: Repository<BranchRamp>,
  ) {}

  async findAllByBranch(branchId: string): Promise<BranchRamp[]> {
    return this.rampRepo.find({
      where: { branchId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, branchId: string): Promise<BranchRamp> {
    const ramp = await this.rampRepo.findOne({
      where: { id, branchId },
    });
    if (!ramp) {
      throw new NotFoundException('Rampa no encontrada');
    }
    return ramp;
  }

  async create(
    branchId: string,
    dto: CreateBranchRampDto,
  ): Promise<BranchRamp> {
    const ramp = this.rampRepo.create({
      branchId,
      name: dto.name,
    });
    return this.rampRepo.save(ramp);
  }

  async update(
    id: string,
    branchId: string,
    dto: UpdateBranchRampDto,
  ): Promise<BranchRamp> {
    await this.findOne(id, branchId);
    await this.rampRepo.update(id, dto as Partial<BranchRamp>);
    return this.findOne(id, branchId);
  }

  async remove(id: string, branchId: string): Promise<void> {
    await this.findOne(id, branchId);
    await this.rampRepo.delete({ id, branchId });
  }

  async countActiveByBranch(branchId: string): Promise<number> {
    return this.rampRepo.count({
      where: { branchId, isActive: true },
    });
  }
}
