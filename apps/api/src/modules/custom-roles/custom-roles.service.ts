import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomRole } from './entities/custom-role.entity';
import {
  CreateCustomRoleDto,
  UpdateCustomRoleDto,
} from './dto/custom-role.dto';
import { RoleMapService } from '../role-map/role-map.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { RoleEnum } from '../users/entities/user.entity';

export interface CustomRoleView extends CustomRole {
  /** Módulos que el perfil alcanza (unión de sus roles base). */
  resolvedModules: { key: string; name: string }[];
  operationCount: number;
}

@Injectable()
export class CustomRolesService {
  constructor(
    @InjectRepository(CustomRole)
    private readonly repo: Repository<CustomRole>,
    private readonly roleMap: RoleMapService,
  ) {}

  /**
   * El superadmin puede operar sobre cualquier tenant (lo indica explícito); un
   * admin queda amarrado al suyo, ignorando cualquier tenantId que mande.
   */
  private resolverTenant(user: UserPayload, tenantId?: string): string {
    const esSuperadmin = user.roles?.includes(RoleEnum.SUPERADMIN);
    if (esSuperadmin && tenantId) return tenantId;
    if (!user.tenantId) {
      throw new BadRequestException('El usuario no tiene tenant asignado');
    }
    return user.tenantId;
  }

  /** Adjunta a un perfil los módulos y operaciones que alcanza. */
  private conCobertura(role: CustomRole): CustomRoleView {
    const mapa = this.roleMap.build();
    const modulos = new Map<string, string>();
    let operationCount = 0;
    const rutasVistas = new Set<string>();

    for (const base of role.baseRoles) {
      const acceso = mapa.roles.find((r) => r.role === base);
      if (!acceso) continue;
      for (const m of acceso.modules) modulos.set(m.key, m.name);
      // Unión de operaciones sin doble conteo entre roles base.
      for (const op of acceso.operations) {
        const clave = `${op.method} ${op.path}`;
        if (!rutasVistas.has(clave)) {
          rutasVistas.add(clave);
          operationCount++;
        }
      }
    }

    return {
      ...role,
      resolvedModules: [...modulos.entries()]
        .map(([key, name]) => ({ key, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      operationCount,
    };
  }

  async findAll(
    user: UserPayload,
    tenantId?: string,
  ): Promise<CustomRoleView[]> {
    const tid = this.resolverTenant(user, tenantId);
    const roles = await this.repo.find({
      where: { tenantId: tid },
      order: { name: 'ASC' },
    });
    return roles.map((r) => this.conCobertura(r));
  }

  async create(
    user: UserPayload,
    dto: CreateCustomRoleDto,
  ): Promise<CustomRoleView> {
    const tid = this.resolverTenant(user, dto.tenantId);
    await this.assertNombreLibre(tid, dto.name);
    const role = this.repo.create({
      tenantId: tid,
      name: dto.name.trim(),
      baseRoles: [...new Set(dto.baseRoles)],
      description: dto.description ?? null,
      isActive: true,
    });
    return this.conCobertura(await this.repo.save(role));
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateCustomRoleDto,
  ): Promise<CustomRoleView> {
    const role = await this.buscar(user, id);
    if (dto.name && dto.name.trim().toLowerCase() !== role.name.toLowerCase()) {
      await this.assertNombreLibre(role.tenantId, dto.name, id);
      role.name = dto.name.trim();
    }
    if (dto.baseRoles) role.baseRoles = [...new Set(dto.baseRoles)];
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.isActive !== undefined) role.isActive = dto.isActive;
    return this.conCobertura(await this.repo.save(role));
  }

  async remove(user: UserPayload, id: string): Promise<{ ok: true }> {
    const role = await this.buscar(user, id);
    await this.repo.remove(role);
    return { ok: true };
  }

  private async buscar(user: UserPayload, id: string): Promise<CustomRole> {
    const role = await this.repo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Perfil no encontrado');
    // Un admin no puede tocar perfiles de otro tenant.
    const esSuperadmin = user.roles?.includes(RoleEnum.SUPERADMIN);
    if (!esSuperadmin && role.tenantId !== user.tenantId) {
      throw new NotFoundException('Perfil no encontrado');
    }
    return role;
  }

  private async assertNombreLibre(
    tenantId: string,
    name: string,
    exceptoId?: string,
  ): Promise<void> {
    const existe = await this.repo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('lower(c.name) = lower(:name)', { name: name.trim() })
      .andWhere(exceptoId ? 'c.id != :exceptoId' : '1=1', { exceptoId })
      .getOne();
    if (existe) {
      throw new ConflictException('Ya existe un perfil con ese nombre');
    }
  }
}
