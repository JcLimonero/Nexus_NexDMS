import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AdminUser } from './entities/admin-user.entity';

const BCRYPT_ROUNDS = 12;

/** Gestión (CRUD) de los usuarios del portal de administración del SaaS. */
@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly repo: Repository<AdminUser>,
  ) {}

  async list(): Promise<Omit<AdminUser, 'passwordHash'>[]> {
    const rows = await this.repo.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return rows.map(({ passwordHash: _omit, ...rest }) => rest);
  }

  async create(dto: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }): Promise<Omit<AdminUser, 'passwordHash'>> {
    const email = dto.email.trim().toLowerCase();
    const existe = await this.repo.findOne({
      where: { email, deletedAt: IsNull() },
    });
    if (existe) throw new ConflictException('Ese correo ya está registrado');
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }
    const user = await this.repo.save(
      this.repo.create({
        email,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        isActive: true,
      }),
    );
    const { passwordHash: _omit, ...rest } = user;
    return rest;
  }

  private async porId(id: string): Promise<AdminUser> {
    const user = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!user) throw new NotFoundException('Usuario admin no encontrado');
    return user;
  }

  async update(
    id: string,
    dto: { firstName?: string; lastName?: string; isActive?: boolean },
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    const user = await this.porId(id);
    if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    const saved = await this.repo.save(user);
    const { passwordHash: _omit, ...rest } = saved;
    return rest;
  }

  async cambiarPassword(id: string, password: string): Promise<void> {
    if (!password || password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }
    const user = await this.porId(id);
    user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.loginAttempts = 0;
    user.blockedUntil = null;
    await this.repo.save(user);
  }

  /** No se puede borrar el último admin activo: dejaría el portal sin acceso. */
  async remove(id: string): Promise<void> {
    const user = await this.porId(id);
    const activos = await this.repo.count({
      where: { deletedAt: IsNull(), isActive: true, id: Not(id) },
    });
    if (activos === 0) {
      throw new BadRequestException(
        'No puedes eliminar al último administrador del portal',
      );
    }
    await this.repo.softRemove(user);
  }
}
