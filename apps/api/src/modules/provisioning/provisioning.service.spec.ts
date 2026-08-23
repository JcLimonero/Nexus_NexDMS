import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ProvisioningService } from './provisioning.service';
import { TenantsService } from '../tenants/tenants.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { LegalEntitiesService } from '../legal-entities/legal-entities.service';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { BranchesService } from '../branches/branches.service';
import { UsersService } from '../users/users.service';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { ResetUserType } from '../password-reset/password-reset-token.entity';
import { EmailComposer } from '../../common/email/email-composer.service';
import { EmailjsService } from '../../common/email/emailjs.service';
import { MasterCatalogsService } from '../master-catalogs/master-catalogs.service';
import { RoleEnum, ScopeEnum } from '../users/entities/user.entity';
import { LegalEntityTypeEnum } from '../legal-entities/entities/legal-entity.entity';
import { TenantPlanEnum } from '../tenants/entities/tenant.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';

/**
 * Pruebas del alta guiada (Fase 2) y la orquestación de la copia de catálogos
 * (Fase 3). Todas las dependencias se mockean.
 */
describe('ProvisioningService', () => {
  let service: ProvisioningService;
  let tenantsService: { create: jest.Mock };
  let tenantRepo: { update: jest.Mock; delete: jest.Mock };
  let legalEntitiesService: { create: jest.Mock };
  let legalEntityRepo: { update: jest.Mock };
  let branchesService: { create: jest.Mock };
  let usersService: { create: jest.Mock };
  let passwordReset: { crear: jest.Mock };
  let masterCatalogs: { copiar: jest.Mock };

  const mockUser: UserPayload = {
    sub: 'super-1',
    tenantId: 'nexus',
    branchId: null,
    legalEntityId: null,
    roles: [RoleEnum.SUPERADMIN],
    scope: ScopeEnum.GLOBAL,
  } as unknown as UserPayload;

  const baseDto: ProvisionTenantDto = {
    name: 'Autos Demo',
    slug: 'autos-demo',
    codePrefix: 'ADE',
    plan: TenantPlanEnum.PRO,
    giro: LegalEntityTypeEnum.AUTO,
    branchName: 'Matriz',
    branchAddress: 'Calle 1',
    branchCity: 'León',
    branchState: 'Gto',
    branchPhone: '4770000000',
    branchEmail: 'm@demo.mx',
    adminFirstName: 'Ana',
    adminLastName: 'López',
    adminEmail: 'ana@demo.mx',
  };

  beforeEach(async () => {
    tenantsService = {
      create: jest.fn().mockResolvedValue({ id: 't1', slug: 'autos-demo' }),
    };
    tenantRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    legalEntitiesService = {
      create: jest.fn().mockResolvedValue({ id: 'le1' }),
    };
    legalEntityRepo = { update: jest.fn().mockResolvedValue(undefined) };
    branchesService = {
      create: jest.fn().mockResolvedValue({ id: 'b1' }),
    };
    usersService = {
      create: jest.fn().mockResolvedValue({ id: 'u1' }),
    };
    passwordReset = { crear: jest.fn().mockResolvedValue('tok') };
    masterCatalogs = { copiar: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvisioningService,
        { provide: TenantsService, useValue: tenantsService },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: LegalEntitiesService, useValue: legalEntitiesService },
        { provide: getRepositoryToken(LegalEntity), useValue: legalEntityRepo },
        { provide: BranchesService, useValue: branchesService },
        { provide: UsersService, useValue: usersService },
        { provide: PasswordResetService, useValue: passwordReset },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('https://app.test') },
        },
        {
          provide: EmailComposer,
          useValue: { brandedClient: jest.fn().mockResolvedValue('<html>') },
        },
        {
          provide: EmailjsService,
          useValue: { enviar: jest.fn().mockResolvedValue(true) },
        },
        { provide: MasterCatalogsService, useValue: masterCatalogs },
      ],
    }).compile();

    service = module.get(ProvisioningService);
  });

  it('crea empresa, entidad legal, sucursal y admin, y devuelve la liga de invitación', async () => {
    const res = await service.provision(mockUser, baseDto);

    expect(res).toEqual({
      tenantId: 't1',
      slug: 'autos-demo',
      legalEntityId: 'le1',
      branchId: 'b1',
      adminUserId: 'u1',
      inviteUrl: 'https://app.test/autos-demo/auth/reset-password?token=tok',
    });

    expect(tenantsService.create).toHaveBeenCalledWith(mockUser, {
      name: 'Autos Demo',
      slug: 'autos-demo',
      codePrefix: 'ADE',
      plan: TenantPlanEnum.PRO,
      isActive: true,
    });
    expect(passwordReset.crear).toHaveBeenCalledWith(
      ResetUserType.TENANT,
      'u1',
    );
  });

  it('crea el primer usuario como ADMIN de la sucursal con contraseña generada', async () => {
    await service.provision(mockUser, baseDto);
    const [tenantId, dto] = usersService.create.mock.calls[0];
    expect(tenantId).toBe('t1');
    expect(dto.roles).toEqual([RoleEnum.ADMIN]);
    expect(dto.scope).toBe(ScopeEnum.GLOBAL);
    expect(dto.branchIds).toEqual(['b1']);
    expect(typeof dto.password).toBe('string');
    expect(dto.password.length).toBeGreaterThan(0);
  });

  it('copia catálogos cuando se seleccionan', async () => {
    const catalogos = [{ key: 'part-categories', all: true }];
    await service.provision(mockUser, { ...baseDto, catalogos });
    expect(masterCatalogs.copiar).toHaveBeenCalledWith('t1', catalogos);
  });

  it('no copia catálogos si no hay selección', async () => {
    await service.provision(mockUser, baseDto);
    expect(masterCatalogs.copiar).not.toHaveBeenCalled();
  });

  it('aplica los datos fiscales sobre la entidad legal', async () => {
    await service.provision(mockUser, {
      ...baseDto,
      rfc: 'XAXX010101000',
      taxRegime: '601',
      taxPostalCode: '37000',
    });
    expect(legalEntityRepo.update).toHaveBeenCalledWith('le1', {
      rfc: 'XAXX010101000',
      taxRegime: '601',
      taxPostalCode: '37000',
    });
  });

  it('parcha plan/paleta/módulos del tenant cuando vienen', async () => {
    await service.provision(mockUser, {
      ...baseDto,
      saasPlanId: 'plan-1',
      palette: 'acero',
      enabledModules: ['clients', 'workshop'],
    });
    expect(tenantRepo.update).toHaveBeenCalledWith('t1', {
      saasPlanId: 'plan-1',
      palette: 'acero',
      enabledModules: ['clients', 'workshop'],
    });
  });

  it('si algo falla después de crear el tenant, lo elimina (sin dejar basura)', async () => {
    branchesService.create.mockRejectedValue(new Error('boom'));
    await expect(service.provision(mockUser, baseDto)).rejects.toThrow('boom');
    expect(tenantRepo.delete).toHaveBeenCalledWith('t1');
    expect(usersService.create).not.toHaveBeenCalled();
  });
});
