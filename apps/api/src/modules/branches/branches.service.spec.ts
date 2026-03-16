import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { Branch } from './entities/branch.entity';
import { BranchConfig } from './entities/branch-config.entity';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import { StorageService } from '../../common/storage/storage.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

describe('BranchesService', () => {
  let service: BranchesService;
  let branchRepo: any;
  let configRepo: any;

  const mockUser: UserPayload = {
    sub: 'user-123',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    legalEntityId: 'legal-entity-1',
    roles: ['ADMIN'],
    scope: ScopeEnum.GLOBAL,
  };

  const mockBranch = {
    id: 'branch-1',
    tenantId: 'tenant-1',
    legalEntityId: 'legal-entity-1',
    name: 'Sucursal Norte',
    slug: 'norte',
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockBranch]),
    getManyAndCount: jest.fn().mockResolvedValue([[mockBranch], 1]),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesService,
        {
          provide: getRepositoryToken(Branch),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(BranchConfig),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn((v: string) => `encrypted:${v}`),
            decrypt: jest.fn((v: string) => v.replace('encrypted:', '')),
          },
        },
        {
          provide: StorageService,
          useValue: {
            upload: jest.fn().mockResolvedValue('https://example.com/logo.png'),
            delete: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<BranchesService>(BranchesService);
    branchRepo = module.get(getRepositoryToken(Branch));
    configRepo = module.get(getRepositoryToken(BranchConfig));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debe retornar sucursales filtradas por tenant', async () => {
      const filters = { page: 1, limit: 20 };
      const result = await service.findAll(mockUser, filters);
      expect(result).toEqual({
        data: [mockBranch],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'b.tenant_id = :tenantId',
        { tenantId: 'tenant-1' },
      );
    });

    it('debe retornar array vacío para BRAND sin legalEntityId', async () => {
      const userBrand = {
        ...mockUser,
        scope: ScopeEnum.BRAND,
        legalEntityId: null,
      };
      const filters = { page: 1, limit: 20 };
      const result = await service.findAll(userBrand, filters);
      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException cuando la sucursal no existe', async () => {
      branchRepo.findOne.mockResolvedValue(null);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser, 'branch-99')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(mockUser, 'branch-99')).rejects.toThrow(
        'Sucursal branch-99 no encontrada',
      );
    });

    it('debe retornar la sucursal cuando existe', async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch);
      mockQueryBuilder.getOne.mockResolvedValue(mockBranch);

      const result = await service.findOne(mockUser, 'branch-1');
      expect(result).toEqual(mockBranch);
    });
  });

  describe('create', () => {
    it('debe crear sucursal y config', async () => {
      const dto: CreateBranchDto = {
        legalEntityId: 'legal-entity-1',
        name: 'Nueva Sucursal',
        slug: 'nueva',
        rfc: 'RFC123456789',
        legalName: 'Razón Social',
        taxRegime: '601',
        taxPostalCode: '64000',
        address: 'Calle 1',
        city: 'Monterrey',
        state: 'NL',
        counterPhone: '8180000000',
        email: 'test@test.com',
        schedule: {},
      };

      const createdBranch = { ...mockBranch, ...dto };
      branchRepo.create.mockReturnValue(createdBranch);
      branchRepo.save.mockResolvedValue(createdBranch);
      configRepo.create.mockReturnValue({ branchId: createdBranch.id });
      configRepo.save.mockResolvedValue({});

      const result = await service.create(mockUser, dto);
      expect(result).toEqual(createdBranch);
      expect(configRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('debe lanzar ForbiddenException cuando MANAGER BRANCH intenta editar', async () => {
      const userManager = {
        ...mockUser,
        roles: ['MANAGER'],
        scope: ScopeEnum.BRANCH,
      };
      branchRepo.findOne.mockResolvedValue(mockBranch);
      mockQueryBuilder.getOne.mockResolvedValue(mockBranch);

      await expect(
        service.update(userManager, 'branch-1', { name: 'Otro' }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(userManager, 'branch-1', { name: 'Otro' }),
      ).rejects.toThrow(
        'Los MANAGER con scope BRANCH no pueden editar sucursales',
      );
    });
  });
});
