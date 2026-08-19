import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, RoleEnum, ScopeEnum } from './entities/user.entity';
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
      specialty: dto.specialty ?? null,
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

  /** Usuarios activos del cliente, para el panel de credenciales de la demo. */
  async demoUsers(tenantId: string): Promise<User[]> {
    return this.userRepo.find({
      where: { tenantId, deletedAt: IsNull(), isActive: true },
      relations: ['roles'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Un usuario administrador del cliente, para "entrar como" desde el portal de
   * superadmin. Prefiere un ADMIN activo; si no hay, cualquier usuario activo
   * del cliente. Recarga con sus roles para poder armar el token.
   */
  async findTenantAdmin(tenantId: string): Promise<User | null> {
    const candidato = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r')
      .where('u.tenant_id = :tenantId', { tenantId })
      .andWhere('u.deleted_at IS NULL')
      .andWhere('u.is_active = true')
      .andWhere('r.role IN (:...roles)', { roles: ['ADMIN', 'SUPERADMIN'] })
      .orderBy('u.created_at', 'ASC')
      .getOne();

    const id = candidato?.id;
    if (id) {
      return this.userRepo.findOne({ where: { id }, relations: ['roles'] });
    }
    return this.userRepo.findOne({
      where: { tenantId, deletedAt: IsNull(), isActive: true },
      relations: ['roles'],
      order: { createdAt: 'ASC' },
    });
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
    // La default marcada va primero; si ninguna está marcada, cae a la más
    // antigua asignada (la "primera de la lista"), de forma determinista.
    const [ub] = await this.userBranchRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
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

  /** Actualiza (o quita, con null) la foto de perfil del usuario. */
  async setAvatarKey(
    userId: string,
    tenantId: string,
    key: string | null,
  ): Promise<void> {
    await this.userRepo.update({ id: userId, tenantId }, { avatarKey: key });
  }

  /**
   * Fija la sucursal por default del usuario. Se llama cuando cambia de
   * sucursal en cualquier módulo: la elección queda persistida para que el
   * refresh del token y el siguiente login lo dejen justo donde estaba.
   *
   * Si el usuario no tiene asignada esa sucursal no hace nada (la validación
   * de acceso vive en quien lo invoca).
   */
  async setDefaultBranch(userId: string, branchId: string): Promise<void> {
    const target = await this.userBranchRepo.findOne({
      where: { userId, branchId },
    });
    if (!target || target.isDefault) return;
    await this.userBranchRepo.update({ userId }, { isDefault: false });
    await this.userBranchRepo.update({ userId, branchId }, { isDefault: true });
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
  // ─── Administración de usuarios del tenant ──────────────────

  /**
   * La plantilla del grupo, con sus roles y sucursales.
   *
   * Se traen roles y sucursales de una vez: la lista los muestra en cada fila
   * y pedirlos por usuario serían tantas consultas como gente tenga el grupo.
   */
  async listar(tenantId: string, incluirInactivos = true) {
    const usuarios = await this.userRepo.find({
      where: { tenantId },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
    const visibles = incluirInactivos
      ? usuarios
      : usuarios.filter((u) => u.isActive);
    if (!visibles.length) return [];

    const ids = visibles.map((u) => u.id);
    const [roles, sucursales] = await Promise.all([
      this.userRoleRepo.find({ where: { userId: In(ids) } }),
      this.userBranchRepo.find({ where: { userId: In(ids) } }),
    ]);

    return visibles.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      specialty: u.specialty,
      scope: u.scope,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      // Una cuenta bloqueada por intentos fallidos se ve igual que una activa
      // en la tabla; se marca para no dejar a alguien sin poder entrar sin
      // que nadie se entere.
      bloqueado: !!u.blockedUntil && new Date(u.blockedUntil) > new Date(),
      roles: roles.filter((r) => r.userId === u.id).map((r) => r.role),
      branchIds: sucursales
        .filter((b) => b.userId === u.id)
        .map((b) => b.branchId),
    }));
  }

  private async delTenant(tenantId: string, id: string): Promise<User> {
    const u = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return u;
  }

  /**
   * Actualiza datos, roles y sucursales.
   *
   * Roles y sucursales se reemplazan por completo cuando vienen: la pantalla
   * edita la lista entera, y aplicar altas y bajas por separado deja estados
   * a medias si una de las dos peticiones falla.
   */
  async actualizar(
    tenantId: string,
    id: string,
    dto: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      specialty?: string | null;
      scope?: ScopeEnum;
      isActive?: boolean;
      roles?: RoleEnum[];
      branchIds?: string[];
    },
    quienEdita?: string,
  ) {
    const u = await this.delTenant(tenantId, id);

    if (dto.roles) {
      if (!dto.roles.length) {
        throw new BadRequestException('El usuario necesita al menos un rol');
      }
      // Nadie se quita a sí mismo la administración: dejaría el grupo sin
      // quien pueda volver a otorgarla.
      if (
        quienEdita === id &&
        !dto.roles.includes(RoleEnum.ADMIN) &&
        !dto.roles.includes(RoleEnum.SUPERADMIN)
      ) {
        throw new BadRequestException(
          'No puedes quitarte a ti mismo el rol de administrador',
        );
      }
      await this.userRoleRepo.delete({ userId: id });
      await this.userRoleRepo.save(
        dto.roles.map((role) => this.userRoleRepo.create({ userId: id, role })),
      );
    }

    if (dto.branchIds) {
      const validas = await this.branchRepo.find({
        where: { id: In(dto.branchIds), tenantId },
      });
      if (validas.length !== dto.branchIds.length) {
        throw new BadRequestException(
          'Alguna sucursal no pertenece a este grupo',
        );
      }
      await this.userBranchRepo.delete({ userId: id });
      await this.userBranchRepo.save(
        dto.branchIds.map((branchId, i) =>
          this.userBranchRepo.create({
            userId: id,
            branchId,
            isDefault: i === 0,
          }),
        ),
      );
    }

    Object.assign(u, {
      firstName: dto.firstName ?? u.firstName,
      lastName: dto.lastName ?? u.lastName,
      phone: dto.phone === undefined ? u.phone : dto.phone,
      specialty: dto.specialty === undefined ? u.specialty : dto.specialty,
      scope: dto.scope ?? u.scope,
      isActive: dto.isActive ?? u.isActive,
    });
    await this.userRepo.save(u);
    return (await this.listar(tenantId)).find((x) => x.id === id);
  }

  /** Suspende o reactiva. No se borra: sus órdenes y ventas lo referencian. */
  async alternarActivo(tenantId: string, id: string, quienEdita?: string) {
    const u = await this.delTenant(tenantId, id);
    if (quienEdita === id) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    u.isActive = !u.isActive;
    await this.userRepo.save(u);
    return { id: u.id, isActive: u.isActive };
  }

  /** Le pone una contraseña nueva y le quita el bloqueo por intentos. */
  async restablecerContrasena(
    tenantId: string,
    id: string,
    password: string,
  ): Promise<void> {
    if (!password || password.length < 8) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres',
      );
    }
    const u = await this.delTenant(tenantId, id);
    u.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    u.passwordChangedAt = new Date();
    u.loginAttempts = 0;
    u.blockedUntil = null;
    await this.userRepo.save(u);
  }

}
