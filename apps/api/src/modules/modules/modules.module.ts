import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Patch,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { Tenant } from '../tenants/entities/tenant.entity';
import {
  MODULE_KEYS,
  MODULE_REGISTRY,
  ModuleKey,
  modulesForPlan,
  resolveModules,
} from './module-registry';

// ─── Servicio ──────────────────────────────────────

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async tenant(tenantId: string): Promise<Tenant> {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!t) throw new NotFoundException('Tenant no encontrado');
    return t;
  }

  /** Catálogo completo con el estado de cada módulo para este tenant. */
  async catalog(tenantId: string) {
    const t = await this.tenant(tenantId);
    const inPlan = new Set(modulesForPlan(t.plan));
    const active = new Set(resolveModules(t.plan, t.enabledModules));
    return {
      plan: t.plan,
      modules: MODULE_REGISTRY.map((m) => ({
        key: m.key,
        name: m.name,
        description: m.description,
        icon: m.icon,
        route: m.route,
        minPlan: m.minPlan,
        core: !!m.core,
        hasDashboard: !!m.hasDashboard,
        includedInPlan: inPlan.has(m.key),
        active: active.has(m.key),
      })),
    };
  }

  /** Módulos efectivos: lo que el web usa para armar menú y rutas. */
  async myModules(tenantId: string) {
    const t = await this.tenant(tenantId);
    const active = resolveModules(t.plan, t.enabledModules);
    const byKey = new Map(MODULE_REGISTRY.map((m) => [m.key, m]));
    return {
      plan: t.plan,
      modules: active.map((k) => {
        const m = byKey.get(k)!;
        return {
          key: m.key,
          name: m.name,
          description: m.description,
          icon: m.icon,
          route: m.route,
          hasDashboard: !!m.hasDashboard,
        };
      }),
    };
  }

  /** Activa/desactiva módulos dentro de lo que permite el plan. */
  async setModules(tenantId: string, keys: string[] | null) {
    const t = await this.tenant(tenantId);

    if (keys === null || keys.length === 0) {
      t.enabledModules = null;
      await this.tenantRepo.save(t);
      return this.catalog(tenantId);
    }

    const unknown = keys.filter((k) => !MODULE_KEYS.includes(k as ModuleKey));
    if (unknown.length) {
      throw new BadRequestException(
        `Módulos desconocidos: ${unknown.join(', ')}`,
      );
    }

    // El plan es el tope: no se puede encender algo fuera de lo contratado
    const allowed = new Set(modulesForPlan(t.plan));
    const outOfPlan = keys.filter((k) => !allowed.has(k as ModuleKey));
    if (outOfPlan.length) {
      throw new BadRequestException(
        `Estos módulos no están incluidos en el plan ${t.plan}: ${outOfPlan.join(', ')}. Sube de plan para habilitarlos.`,
      );
    }

    t.enabledModules = keys;
    await this.tenantRepo.save(t);
    return this.catalog(tenantId);
  }

  async isActive(tenantId: string, key: string): Promise<boolean> {
    const t = await this.tenant(tenantId);
    return resolveModules(t.plan, t.enabledModules).includes(key as ModuleKey);
  }
}

// ─── Guard de licencia ─────────────────────────────

export const REQUIRES_MODULE = 'requires_module';

/** Marca un controlador/endpoint como perteneciente a un módulo licenciable. */
export const RequiresModule = (key: ModuleKey) =>
  SetMetadata(REQUIRES_MODULE, key);

/**
 * Bloquea el acceso a endpoints de módulos que el tenant no tiene activos.
 * Sin esto, ocultar el menú sería solo cosmético: la API seguiría abierta.
 */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly modulesService: ModulesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<ModuleKey>(
      REQUIRES_MODULE,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const req = context.switchToHttp().getRequest<{ user?: UserPayload }>();
    const user = req.user;
    if (!user?.tenantId) return true; // sin sesión lo resuelve AuthGuard

    // El superadmin de Nexus opera fuera del esquema de licencias
    if (user.roles?.includes('SUPERADMIN')) return true;

    const ok = await this.modulesService.isActive(user.tenantId, required);
    if (!ok) {
      throw new ForbiddenException(
        `El módulo "${required}" no está incluido en tu licencia.`,
      );
    }
    return true;
  }
}

// ─── Controller ────────────────────────────────────

@ApiTags('Modules')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  /** Módulos activos del tenant (menú y rutas del web). */
  @Get('me')
  // Cualquiera que entre al DMS necesita saber qué módulos tiene: sin esto el
  // menú sale vacío y el guard de rutas lo devuelve al inicio.
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'MECHANIC',
    'SELLER',
    'RECEPTIONIST',
  )
  myModules(@CurrentUser() user: UserPayload) {
    return this.modulesService.myModules(user.tenantId);
  }

  /** Catálogo completo con estado por módulo (pantalla de administración). */
  @Get('catalog')
  @Roles('SUPERADMIN', 'ADMIN')
  catalog(@CurrentUser() user: UserPayload) {
    return this.modulesService.catalog(user.tenantId);
  }

  @Patch('me')
  @Roles('SUPERADMIN', 'ADMIN')
  setModules(
    @CurrentUser() user: UserPayload,
    @Body() body: { modules: string[] | null },
  ) {
    return this.modulesService.setModules(user.tenantId, body.modules ?? null);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [ModulesController],
  providers: [ModulesService, ModuleGuard],
  exports: [ModulesService, ModuleGuard],
})
export class ModulesModule {}
