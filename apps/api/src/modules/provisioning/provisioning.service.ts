import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { TenantsService } from '../tenants/tenants.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { LegalEntitiesService } from '../legal-entities/legal-entities.service';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { BranchesService } from '../branches/branches.service';
import { UsersService } from '../users/users.service';
import { RoleEnum, ScopeEnum } from '../users/entities/user.entity';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { ResetUserType } from '../password-reset/password-reset-token.entity';
import { EmailComposer } from '../../common/email/email-composer.service';
import { EmailjsService } from '../../common/email/emailjs.service';
import { emailButton } from '../../common/email/templates';
import { MasterCatalogsService } from '../master-catalogs/master-catalogs.service';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';

export interface ResultadoProvisioning {
  tenantId: string;
  slug: string;
  legalEntityId: string;
  branchId: string;
  adminUserId: string;
  inviteUrl: string;
}

/**
 * Orquesta el alta completa de una empresa (Fase 2 del wizard): crea el tenant,
 * su entidad legal (datos fiscales), la sucursal inicial y el primer usuario
 * admin, y le manda una liga de invitación para que ponga su contraseña.
 *
 * Reutiliza los servicios de cada módulo con un payload sintético del tenant
 * recién creado. Si algo falla a mitad, deshace lo creado (best-effort) para no
 * dejar empresas a medias.
 */
@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    private readonly tenantsService: TenantsService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly legalEntitiesService: LegalEntitiesService,
    @InjectRepository(LegalEntity)
    private readonly legalEntityRepo: Repository<LegalEntity>,
    private readonly branchesService: BranchesService,
    private readonly usersService: UsersService,
    private readonly passwordReset: PasswordResetService,
    private readonly config: ConfigService,
    private readonly composer: EmailComposer,
    private readonly emailjs: EmailjsService,
    private readonly masterCatalogs: MasterCatalogsService,
  ) {}

  async provision(
    user: UserPayload,
    dto: ProvisionTenantDto,
  ): Promise<ResultadoProvisioning> {
    // 1) Empresa (tenant) con su prefijo, plan y módulos.
    const tenant = await this.tenantsService.create(user, {
      name: dto.name,
      slug: dto.slug,
      codePrefix: dto.codePrefix,
      plan: dto.plan,
      isActive: true,
    });

    // Payload sintético con el tenant nuevo, para reusar los servicios.
    const asTenant: UserPayload = {
      ...user,
      tenantId: tenant.id,
      scope: ScopeEnum.GLOBAL,
      roles: [RoleEnum.SUPERADMIN],
    } as UserPayload;

    try {
      // Ajustes del tenant que create() no cubre.
      const patch: Partial<Tenant> = {};
      if (dto.saasPlanId) patch.saasPlanId = dto.saasPlanId;
      if (dto.enabledModules !== undefined)
        patch.enabledModules = dto.enabledModules;
      if (dto.palette) patch.palette = dto.palette;
      if (Object.keys(patch).length) {
        await this.tenantRepo.update(tenant.id, patch);
      }

      // 2) Entidad legal (datos fiscales).
      const legal = await this.legalEntitiesService.create(asTenant, {
        name: (dto.razonSocial || dto.name).trim(),
        type: dto.giro,
      });
      if (dto.rfc || dto.taxRegime || dto.taxPostalCode) {
        await this.legalEntityRepo.update(legal.id, {
          rfc: dto.rfc ?? null,
          taxRegime: dto.taxRegime ?? null,
          taxPostalCode: dto.taxPostalCode ?? null,
        });
      }

      // 3) Sucursal inicial (principal).
      const branch = await this.branchesService.create(asTenant, {
        legalEntityId: legal.id,
        name: dto.branchName,
        slug: dto.branchSlug?.trim() || this.slugify(dto.branchName),
        address: dto.branchAddress,
        city: dto.branchCity,
        state: dto.branchState,
        counterPhone: dto.branchPhone,
        email: dto.branchEmail,
        schedule: {},
        isPrimary: true,
      });

      // 4) Primer usuario admin (contraseña aleatoria; entra por invitación).
      const adminUser = await this.usersService.create(tenant.id, {
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        email: dto.adminEmail,
        password: randomUUID(),
        scope: ScopeEnum.GLOBAL,
        roles: [RoleEnum.ADMIN],
        branchIds: [branch.id],
      });

      // 5) Copia de catálogos base elegidos del maestro.
      if (dto.catalogos?.length) {
        await this.masterCatalogs.copiar(tenant.id, dto.catalogos);
      }

      // 6) Liga de invitación para que defina su contraseña.
      const inviteUrl = await this.enviarInvitacion(
        tenant.id,
        tenant.slug,
        adminUser.id,
        dto.adminEmail,
        dto.name,
      );

      return {
        tenantId: tenant.id,
        slug: tenant.slug,
        legalEntityId: legal.id,
        branchId: branch.id,
        adminUserId: adminUser.id,
        inviteUrl,
      };
    } catch (e) {
      // Deshace la empresa a medias para no dejar basura.
      await this.tenantRepo.delete(tenant.id).catch((err) => {
        this.logger.error(
          `No se pudo limpiar el tenant ${tenant.id} tras un alta fallida: ${
            (err as Error).message
          }`,
        );
      });
      throw e;
    }
  }

  /** Crea el token de invitación, arma la liga y manda el correo (best-effort). */
  private async enviarInvitacion(
    tenantId: string,
    slug: string,
    userId: string,
    email: string,
    empresa: string,
  ): Promise<string> {
    const token = await this.passwordReset.crear(ResetUserType.TENANT, userId);
    const base = this.config.get<string>(
      'WEB_APP_URL',
      'https://app.nexusqsystem.com',
    );
    const inviteUrl = `${base}/${slug}/auth/reset-password?token=${token}`;
    try {
      const body =
        `<p>¡Bienvenido a NexQSystem! Se creó la cuenta de <strong>${empresa}</strong> ` +
        `y eres su administrador.</p>` +
        `<p>Define tu contraseña para entrar (el enlace vence en 1 hora):</p>` +
        emailButton('Definir mi contraseña', inviteUrl) +
        `<p style="color:#94a3b8">Si no esperabas este correo, ignóralo.</p>`;
      const html = await this.composer.brandedClient(
        tenantId,
        'Tu cuenta de NexQSystem está lista',
        body,
        'Bienvenida',
      );
      await this.emailjs.enviar({
        subject: 'Tu cuenta de NexQSystem está lista',
        html,
        to: email,
      });
    } catch (e) {
      this.logger.warn(
        `No se pudo enviar la invitación a ${email}: ${(e as Error).message}`,
      );
    }
    return inviteUrl;
  }

  private slugify(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
