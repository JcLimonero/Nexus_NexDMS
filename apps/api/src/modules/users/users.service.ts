import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { tenantId, email, deletedAt: IsNull() },
    });
  }

  async findOneOrFail(id: string, tenantId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return user;
  }

  async save(user: User): Promise<User> {
    return this.userRepo.save(user);
  }
}
