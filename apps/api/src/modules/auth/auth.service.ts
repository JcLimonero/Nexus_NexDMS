import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import type { Redis } from 'ioredis';
import { Inject } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import type { UserPayload } from './strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { StorageService } from '../../common/storage/storage.service';
import { PALETA_POR_OMISION, paletaPorId } from '../tenants/branding.paletas';

const REFRESH_KEY_PREFIX = 'refresh:';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly storage: StorageService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(
      dto.tenantId ?? '',
      dto.email,
    );
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const roles = this.usersService.getRoleNames(user);
    if (roles.length === 0) {
      throw new UnauthorizedException(
        'Usuario sin roles asignados. Contacte al administrador.',
      );
    }

    const now = new Date();
    if (user.blockedUntil && user.blockedUntil > now) {
      throw new UnauthorizedException('Account blocked');
    }

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException('Account blocked');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await this.usersService.save(user);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.totpEnabled) {
      if (!dto.totpCode) {
        return {
          requiresTotp: true,
          message: 'Se requiere código de autenticación en dos pasos',
        };
      }
      if (!user.totpSecret) {
        throw new UnauthorizedException('TOTP no configurado correctamente');
      }
      const isValid = authenticator.verify({
        token: dto.totpCode,
        secret: user.totpSecret,
      });
      if (!isValid) {
        throw new UnauthorizedException('Código de autenticación inválido');
      }
    }

    user.loginAttempts = 0;
    user.blockedUntil = null;
    user.lastLoginAt = now;
    await this.usersService.save(user);

    const defaultBranch = await this.usersService.getDefaultBranchForUser(
      user.id,
    );
    if (!defaultBranch) {
      throw new UnauthorizedException(
        'Usuario sin sucursales asignadas. Contacte al administrador.',
      );
    }
    const payload: UserPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      branchId: defaultBranch.branchId,
      legalEntityId: defaultBranch.legalEntityId,
      roles,
      scope: user.scope,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, tenantId: user.tenantId },
      {
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    try {
      await this.redis.setex(
        `${REFRESH_KEY_PREFIX}${user.id}`,
        REFRESH_TTL_SECONDS,
        refreshToken,
      );
    } catch {
      throw new ServiceUnavailableException(
        'Redis no disponible. Verifica que el contenedor nexDMS_redis esté corriendo.',
      );
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles,
        scope: user.scope,
      },
      // La marca viaja ya en el login para pintar el DMS de una vez, sin la
      // llamada extra a /auth/me y el parpadeo que traería.
      branding: await this.brandingDelTenant(user.tenantId),
    };
  }

  /**
   * "Entrar como" un cliente desde el portal de superadmin: emite una sesión de
   * DMS para el administrador de ese cliente. No pide su contraseña —el
   * superadmin ya tiene el control—, y solo lo puede invocar un SUPERADMIN
   * (lo hace cumplir el guard del endpoint). Devuelve además la liga lista para
   * abrir el DMS con la sesión puesta.
   */
  async impersonate(tenantId: string) {
    const admin = await this.usersService.findTenantAdmin(tenantId);
    if (!admin) {
      throw new NotFoundException(
        'El cliente no tiene usuarios para entrar',
      );
    }
    const defaultBranch = await this.usersService.getDefaultBranchForUser(
      admin.id,
    );
    if (!defaultBranch) {
      throw new BadRequestException(
        'El usuario del cliente no tiene sucursal asignada',
      );
    }
    const roles = this.usersService.getRoleNames(admin);
    const payload: UserPayload = {
      sub: admin.id,
      tenantId: admin.tenantId,
      branchId: defaultBranch.branchId,
      legalEntityId: defaultBranch.legalEntityId,
      roles,
      scope: admin.scope,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: admin.id, tenantId: admin.tenantId },
      { expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d') },
    );
    try {
      await this.redis.setex(
        `${REFRESH_KEY_PREFIX}${admin.id}`,
        REFRESH_TTL_SECONDS,
        refreshToken,
      );
    } catch {
      // Sin refresh en Redis la sesión igual sirve para la demo; no se corta.
    }

    // El DMS vive en otro origen: se entrega la liga con los tokens en el
    // fragmento (#), que no viaja al servidor ni queda en logs. La liga cuelga
    // del slug del cliente para caer en su espacio (`/<slug>/…`).
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const dmsUrl = this.config.get<string>('WEB_APP_URL', 'http://app.localhost');
    const base = tenant?.slug ? `${dmsUrl}/${tenant.slug}` : dmsUrl;
    return {
      accessToken,
      refreshToken,
      dmsUrl,
      url: `${base}/sso#at=${accessToken}&rt=${refreshToken}`,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }
    try {
      const payload = this.jwtService.verify<{ sub: string; tenantId: string }>(
        refreshToken,
        { secret: this.config.get('JWT_SECRET') },
      );
      const userId = payload.sub;
      const tenantId = payload.tenantId;
      const stored = await this.redis.get(`${REFRESH_KEY_PREFIX}${userId}`);
      if (!stored) {
        throw new UnauthorizedException('Session expired');
      }
      const user = await this.usersService.findOneOrFail(userId, tenantId);
      const defaultBranch = await this.usersService.getDefaultBranchForUser(
        user.id,
      );
      if (!defaultBranch) {
        throw new UnauthorizedException('Usuario sin sucursales asignadas');
      }
      const roles = this.usersService.getRoleNames(user);
      const accessPayload: UserPayload = {
        sub: user.id,
        tenantId: user.tenantId,
        branchId: defaultBranch.branchId,
        legalEntityId: defaultBranch.legalEntityId,
        roles,
        scope: user.scope,
      };
      const accessToken = this.jwtService.sign(accessPayload);
      return { accessToken };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Session expired');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.redis.del(`${REFRESH_KEY_PREFIX}${userId}`);
  }

  async changePassword(
    user: UserPayload,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const dbUser = await this.usersService.findOneOrFail(
      user.sub,
      user.tenantId,
    );
    const valid = await bcrypt.compare(
      dto.currentPassword,
      dbUser.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }
    dbUser.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    dbUser.passwordChangedAt = new Date();
    await this.usersService.save(dbUser);
  }

  async switchBranch(user: UserPayload, branchId: string) {
    const canAccess = await this.usersService.canAccessBranch(
      user.sub,
      branchId,
    );
    if (!canAccess) {
      throw new UnauthorizedException('No tiene acceso a esta sucursal');
    }
    const dbUser = await this.usersService.findOneOrFail(
      user.sub,
      user.tenantId,
    );
    const branches = await this.usersService.getBranchesForUser(user.sub);
    const selected = branches.find((b) => b.branchId === branchId);
    if (!selected) {
      throw new UnauthorizedException('Sucursal no encontrada');
    }
    // La elección queda como su default para que el refresh y el próximo login
    // lo dejen en la misma sucursal.
    await this.usersService.setDefaultBranch(dbUser.id, selected.branchId);
    const roles = this.usersService.getRoleNames(dbUser);
    const payload: UserPayload = {
      sub: dbUser.id,
      tenantId: selected.tenantId,
      branchId: selected.branchId,
      legalEntityId: selected.legalEntityId,
      roles,
      scope: dbUser.scope,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }

  async switchLegalEntity(user: UserPayload, legalEntityId: string) {
    const branches = await this.usersService.getBranchesForUser(user.sub);
    const selected = branches.find((b) => b.legalEntityId === legalEntityId);
    if (!selected) {
      throw new UnauthorizedException('No tiene acceso a esta entidad legal');
    }
    const dbUser = await this.usersService.findOneOrFail(
      user.sub,
      user.tenantId,
    );
    // Cambiar de entidad legal aterriza en una de sus sucursales; esa queda
    // como default para conservarla tras un refresh.
    await this.usersService.setDefaultBranch(dbUser.id, selected.branchId);
    const roles = this.usersService.getRoleNames(dbUser);
    const payload: UserPayload = {
      sub: dbUser.id,
      tenantId: selected.tenantId,
      branchId: selected.branchId,
      legalEntityId: selected.legalEntityId,
      roles,
      scope: dbUser.scope,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }

  async getMe(user: UserPayload) {
    const dbUser = await this.usersService.findOneOrFail(
      user.sub,
      user.tenantId,
    );
    const defaultBranch = await this.usersService.getDefaultBranchForUser(
      dbUser.id,
    );
    const branches = await this.usersService.getBranchesForUser(dbUser.id);
    const legalEntities = branches.reduce(
      (acc, b) => {
        if (!acc.find((le) => le.id === b.legalEntityId)) {
          acc.push({
            id: b.legalEntityId,
            name: b.legalEntityName,
          });
        }
        return acc;
      },
      [] as Array<{ id: string; name: string }>,
    );
    // La sucursal activa es la del token, no la de por defecto: al cambiar de
    // contexto con `switch-branch` se emite un token nuevo, y devolver aquí la
    // predeterminada hacía que el cambio pareciera no surtir efecto.
    const activa =
      branches.find((b) => b.branchId === user.branchId) ?? defaultBranch;
    return {
      id: dbUser.id,
      tenantId: dbUser.tenantId,
      branchId: activa?.branchId ?? null,
      legalEntityId: activa?.legalEntityId ?? null,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      email: dbUser.email,
      roles: this.usersService.getRoleNames(dbUser),
      scope: dbUser.scope,
      branches,
      legalEntities,
      // La marca del cliente viaja con la sesión: el DMS la necesita antes de
      // pintar la primera pantalla, y pedirla aparte dejaría ver un parpadeo
      // con los colores de fábrica en cada entrada.
      branding: await this.brandingDelTenant(dbUser.tenantId),
    };
  }

  /**
   * Marca pública de un cliente por su identificador (slug), para vestir la
   * pantalla de acceso antes de iniciar sesión. Solo expone nombre, colores y
   * logotipo —nada sensible—, así que no requiere sesión.
   */
  async brandingPublicoPorSlug(slug: string) {
    const t = await this.tenantRepo.findOne({ where: { slug } });
    if (!t) throw new NotFoundException('Cliente no encontrado');
    // El id acompaña a la marca para acotar el acceso a este cliente.
    return { id: t.id, ...(await this.brandingDelTenant(t.id)) };
  }

  /**
   * Usuarios de demostración de un cliente (por slug), para el panel de
   * credenciales de su acceso. Solo fuera de producción: en producción ese
   * panel no existe. No devuelve contraseñas; todas las cuentas demo usan la
   * misma (`demo123`), que la pantalla muestra aparte.
   */
  async demoUsers(slug: string) {
    if (this.config.get('NODE_ENV') === 'production') return [];
    const t = await this.tenantRepo.findOne({ where: { slug } });
    if (!t) return [];
    const users = await this.usersService.demoUsers(t.id);
    return users.map((u) => ({
      email: u.email,
      nombre: `${u.firstName} ${u.lastName}`.trim(),
      roles: this.usersService.getRoleNames(u),
    }));
  }

  /** Paleta y logotipo del cliente, resueltos para pintar. */
  private async brandingDelTenant(tenantId: string) {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    // Un día de vigencia: la sesión dura menos, y así la imagen no se cae a
    // media jornada en el monitor del taller, que nadie recarga.
    const ligaImagen = async (key: string | null): Promise<string | null> => {
      if (!key) return null;
      try {
        return await this.storage.getSignedUrl(key, 24 * 3600);
      } catch {
        /* sin almacenamiento se entra igual, solo que sin imagen */
        return null;
      }
    };
    const [logoUrl, iconUrl] = await Promise.all([
      ligaImagen(t?.logoKey ?? null),
      ligaImagen(t?.iconKey ?? null),
    ]);
    return {
      // El nombre viaja con la marca para rotular la pestaña con el cliente,
      // que es clave cuando el superadmin abre varios a la vez.
      nombre: t?.name ?? null,
      paletaId: t?.palette ?? PALETA_POR_OMISION.id,
      paleta: paletaPorId(t?.palette),
      currency: t?.currency ?? 'MXN',
      logoUrl,
      iconUrl,
    };
  }
}
