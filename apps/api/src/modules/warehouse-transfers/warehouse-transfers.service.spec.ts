import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WarehouseTransfersService } from './warehouse-transfers.service';
import { WarehouseTransfer } from './entities/warehouse-transfer.entity';
import { WarehouseTransferItem } from './entities/warehouse-transfer-item.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { CreateWarehouseTransferDto } from './dto/create-warehouse-transfer.dto';
import {
  WarehouseTransferStatusEnum,
  WarehouseTransferTypeEnum,
} from './entities/warehouse-transfer.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

describe('WarehouseTransfersService', () => {
  let service: WarehouseTransfersService;
  let transferRepo: any;

  const mockUser: UserPayload = {
    sub: 'user-123',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    brandId: 'brand-1',
    role: 'WAREHOUSE',
    scope: ScopeEnum.BRAND,
  };

  const mockTransfer = {
    id: 'transfer-1',
    tenantId: 'tenant-1',
    originBranchId: 'branch-1',
    destinationBranchId: 'branch-2',
    status: WarehouseTransferStatusEnum.PENDING,
    type: WarehouseTransferTypeEnum.INTRA_BRAND,
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTransfer], 1]),
    getOne: jest.fn(),
  };

  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    query: jest.fn().mockResolvedValue([{ last_value: 1 }]),
  };

  beforeEach(async () => {
    const mockTransaction = jest.fn((cb) => cb(mockEntityManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseTransfersService,
        {
          provide: getRepositoryToken(WarehouseTransfer),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(WarehouseTransferItem),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Branch),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Part),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: mockTransaction,
            manager: mockEntityManager,
          },
        },
      ],
    }).compile();

    service = module.get<WarehouseTransfersService>(WarehouseTransfersService);
    transferRepo = module.get(getRepositoryToken(WarehouseTransfer));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe lanzar ForbiddenException cuando el rol no puede crear transferencias', async () => {
      const userCashier = { ...mockUser, role: 'CASHIER' };
      const dto: CreateWarehouseTransferDto = {
        originBranchId: 'branch-1',
        destinationBranchId: 'branch-2',
        type: WarehouseTransferTypeEnum.INTRA_BRAND,
        items: [{ partId: 'part-1', quantity: 1 }],
      };

      await expect(service.create(userCashier, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(userCashier, dto)).rejects.toThrow(
        'Solo WAREHOUSE y ADMIN pueden crear o modificar transferencias',
      );
    });

    it('debe lanzar BadRequestException cuando origin y destination son iguales', async () => {
      const dto: CreateWarehouseTransferDto = {
        originBranchId: 'branch-1',
        destinationBranchId: 'branch-1',
        type: WarehouseTransferTypeEnum.INTRA_BRAND,
        items: [{ partId: 'part-1', quantity: 1 }],
      };

      await expect(service.create(mockUser, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(mockUser, dto)).rejects.toThrow(
        'Origen y destino deben ser sucursales diferentes',
      );
    });

    it('debe lanzar BadRequestException cuando no hay items', async () => {
      const dto: CreateWarehouseTransferDto = {
        originBranchId: 'branch-1',
        destinationBranchId: 'branch-2',
        type: WarehouseTransferTypeEnum.INTRA_BRAND,
        items: [],
      };

      await expect(service.create(mockUser, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('debe retornar transferencias filtradas por tenant', async () => {
      const result = await service.findAll(mockUser, {});
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'wt.tenant_id = :tenantId',
        { tenantId: 'tenant-1' },
      );
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException cuando la transferencia no existe', async () => {
      transferRepo.findOne.mockResolvedValue(null);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser, 'transfer-99')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
