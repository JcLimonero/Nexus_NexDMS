import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CfdiService } from '../cfdi/cfdi.service';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { CashSession } from '../cash-register/entities/cash-session.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PriceListEnum } from './entities/sale.entity';
import { SalePaymentMethodEnum } from './entities/sale-payment.entity';
import { CashSessionStatusEnum } from '../cash-register/entities/cash-session.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

describe('SalesService', () => {
  let service: SalesService;
  let saleRepo: any;
  let cashSessionRepo: any;
  let branchRepo: any;
  let partRepo: any;

  const mockUser: UserPayload = {
    sub: 'user-123',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    legalEntityId: 'legal-entity-1',
    roles: ['CASHIER'],
    scope: ScopeEnum.SUCURSAL,
  };

  const mockCashSession = {
    id: 'session-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    status: CashSessionStatusEnum.OPEN,
    totalCash: 0,
    totalCard: 0,
    totalTransfer: 0,
    totalSales: 0,
  };

  const mockBranch = {
    id: 'branch-1',
    tenantId: 'tenant-1',
    taxRate: 0.16,
  };

  const mockPart = {
    id: 'part-1',
    branchId: 'branch-1',
    tenantId: 'tenant-1',
    name: 'Parte Test',
    stockQuantity: 100,
  };

  const createDto: CreateSaleDto = {
    branchId: 'branch-1',
    priceList: PriceListEnum.PUBLIC,
    discount: 0,
    lines: [{ partId: 'part-1', quantity: 2, unitPrice: 100, discount: 0 }],
    payments: [{ method: SalePaymentMethodEnum.CASH, amount: 232 }],
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn(),
  };

  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    }),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const mockTransaction = jest.fn((cb) => cb(mockEntityManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: getRepositoryToken(Sale),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(SaleItem),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(SalePayment),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(CashSession),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Branch),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Part),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getOne: jest.fn(),
            }),
          },
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
        {
          provide: CfdiService,
          useValue: {
            generarIngreso: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    saleRepo = module.get(getRepositoryToken(Sale));
    cashSessionRepo = module.get(getRepositoryToken(CashSession));
    branchRepo = module.get(getRepositoryToken(Branch));
    partRepo = module.get(getRepositoryToken(Part));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe lanzar BadRequestException cuando no hay líneas', async () => {
      const dto = { ...createDto, lines: [] };

      await expect(service.create(mockUser, dto)).rejects.toThrow(
        'Debe incluir al menos una línea',
      );
    });

    it('debe lanzar BadRequestException cuando no hay pagos', async () => {
      const dto = { ...createDto, payments: [] };

      await expect(service.create(mockUser, dto)).rejects.toThrow(
        'Debe incluir al menos un pago',
      );
    });

    it('debe lanzar BadRequestException cuando no hay caja abierta', async () => {
      cashSessionRepo.findOne.mockResolvedValue(null);
      branchRepo.findOne.mockResolvedValue(mockBranch);
      partRepo.find.mockResolvedValue([mockPart]);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'No hay caja abierta para esta sucursal',
      );
    });

    it('debe lanzar NotFoundException cuando la sucursal no existe', async () => {
      cashSessionRepo.findOne.mockResolvedValue(mockCashSession);
      branchRepo.findOne.mockResolvedValue(null);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'Sucursal no encontrada',
      );
    });

    it('debe lanzar NotFoundException cuando las partes no existen', async () => {
      cashSessionRepo.findOne.mockResolvedValue(mockCashSession);
      branchRepo.findOne.mockResolvedValue(mockBranch);
      partRepo.find.mockResolvedValue([]);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'Parte(s) no encontrada(s)',
      );
    });

    it('debe lanzar BadRequestException cuando los pagos no suman el total', async () => {
      cashSessionRepo.findOne.mockResolvedValue(mockCashSession);
      branchRepo.findOne.mockResolvedValue(mockBranch);
      partRepo.find.mockResolvedValue([mockPart]);
      const dtoBadPayment = {
        ...createDto,
        payments: [{ method: SalePaymentMethodEnum.CASH, amount: 100 }],
      };

      await expect(service.create(mockUser, dtoBadPayment)).rejects.toThrow(
        'Los pagos',
      );
    });

    it('debe lanzar ForbiddenException cuando el rol no puede crear ventas', async () => {
      const userMechanic = { ...mockUser, roles: ['MECHANIC'] };

      await expect(service.create(userMechanic, createDto)).rejects.toThrow(
        'Solo CASHIER, SELLER y ADMIN pueden crear ventas',
      );
    });
  });

  describe('findAll', () => {
    it('debe retornar data y meta con paginación', async () => {
      saleRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toMatchObject({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException cuando la venta no existe', async () => {
      saleRepo.findOne.mockResolvedValue(null);
      saleRepo.createQueryBuilder().getOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser, 'sale-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
