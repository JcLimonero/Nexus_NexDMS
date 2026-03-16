import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, RoleEnum } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { UserBranch } from '../legal-entities/entities/user-branch.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { CreateUserDto } from './dto/create-user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(UserBranch)
    private readonly userBranchRepo: Repository<UserBranch>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(LegalEntity)
    private readonly legalEntityRepo: Repository<LegalEntity>,
  ) {}

  async create(tenantId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(tenantId, dto.email);
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }
    const branchIds = dto.branchIds ?? [];
    if (branchIds.length === 0) {
      throw new BadRequestException(
        'Se requiere al menos una sucursal asignada para que el usuario pueda iniciar sesión',
      );
    }
    const branchesInTenant = await this.branchRepo.find({
      where: { id: In(branchIds), tenantId },
      select: ['id'],
    });
    const validBranchIds = new Set(branchesInTenant.map((b) => b.id));
    const invalidBranchIds = branchIds.filter((id) => !validBranchIds.has(id));
    if (invalidBranchIds.length > 0) {
      throw new BadRequestException(
        `Las sucursales ${invalidBranchIds.join(', ')} no existen o no pertenecen al tenant`,
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      tenantId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash,
      scope: dto.scope,
      isActive: true,
    });
    const saved = await this.userRepo.save(user);
    for (const role of dto.roles) {
      await this.userRoleRepo.save(
        this.userRoleRepo.create({ userId: saved.id, role }),
      );
    }
    for (let i = 0; i < branchIds.length; i++) {
      await this.userBranchRepo.save(
        this.userBranchRepo.create({
          userId: saved.id,
          branchId: branchIds[i],
          isDefault: i === 0,
        }),
      );
    }
    const created = await this.findOneOrFail(saved.id, tenantId);
    const { passwordHash: _, ...userWithoutPassword } = created;
    return userWithoutPassword as User;
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const where: { email: string; deletedAt: any } & { tenantId?: string } = {
      email,
      deletedAt: IsNull(),
    };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    return this.userRepo.findOne({
      where,
      relations: ['roles'],
    });
  }

  async findOneOrFail(id: string, tenantId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return user;
  }

  getRoleNames(user: User): string[] {
    return user.roles?.map((r) => r.role) ?? [];
  }

  async save(user: User): Promise<User> {
    return this.userRepo.save(user);
  }

  async getBranchesForUser(userId: string): Promise<
    Array<{
      branchId: string;
      branchName: string;
      legalEntityId: string;
      legalEntityName: string;
      tenantId: string;
      isDefault: boolean;
    }>
  > {
    const userBranches = await this.userBranchRepo.find({
      where: { userId },
      order: { isDefault: 'DESC' },
    });
    if (userBranches.length === 0) return [];
    const branchIds = userBranches.map((ub) => ub.branchId);
    const branches = await this.branchRepo.find({
      where: { id: In(branchIds) },
      relations: [],
    });
    const branchMap = new Map(branches.map((b) => [b.id, b]));
    const legalEntityIds = [...new Set(branches.map((b) => b.legalEntityId))];
    const legalEntities = await this.legalEntityRepo.find({
      where: { id: In(legalEntityIds) },
    });
    const legalEntityMap = new Map(legalEntities.map((le) => [le.id, le]));
    return userBranches
      .map((ub) => {
        const branch = branchMap.get(ub.branchId);
        if (!branch) return null;
        const legalEntity = legalEntityMap.get(branch.legalEntityId);
        return {
          branchId: branch.id,
          branchName: branch.name,
          legalEntityId: branch.legalEntityId,
          legalEntityName: legalEntity?.name ?? branch.legalEntityId,
          tenantId: branch.tenantId,
          isDefault: ub.isDefault,
        };
      })
      .filter(Boolean) as Array<{
      branchId: string;
      branchName: string;
      legalEntityId: string;
      legalEntityName: string;
      tenantId: string;
      isDefault: boolean;
    }>;
  }

  async getDefaultBranchForUser(userId: string): Promise<{
    branchId: string;
    legalEntityId: string;
  } | null> {
    const [ub] = await this.userBranchRepo.find({
      where: { userId },
      order: { isDefault: 'DESC' },
      take: 1,
    });
    if (!ub) return null;
    const branch = await this.branchRepo.findOne({
      where: { id: ub.branchId },
    });
    if (!branch) return null;
    return {
      branchId: branch.id,
      legalEntityId: branch.legalEntityId,
    };
  }

  async canAccessBranch(userId: string, branchId: string): Promise<boolean> {
    const ub = await this.userBranchRepo.findOne({
      where: { userId, branchId },
    });
    return !!ub;
  }

  async getUsersByRoleInBranch(
    branchId: string,
    roles: RoleEnum[],
  ): Promise<User[]> {
    const users = await this.userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.roles', 'ur')
      .innerJoin(UserBranch, 'ub', 'ub.user_id = u.id')
      .where('ub.branch_id = :branchId', { branchId })
      .andWhere('ur.role IN (:...roles)', { roles })
      .andWhere('u.deleted_at IS NULL')
      .andWhere('u.is_active = :isActive', { isActive: true })
      .select(['u.id', 'u.email', 'u.firstName', 'u.lastName'])
      .getMany();
    return users;
  }
}
