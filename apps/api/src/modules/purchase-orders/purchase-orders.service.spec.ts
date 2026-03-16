import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { PurchaseOrderStatusEnum } from './entities/purchase-order.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let orderRepo: any;
  let itemRepo: any;
  let branchRepo: any;
  let supplierRepo: any;
  let partRepo: any;

  const mockUser: UserPayload = {
    sub: 'user-123',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    legalEntityId: 'legal-entity-1',
    roles: ['WAREHOUSE'],
    scope: ScopeEnum.BRANCH,
  };

  const mockBranch = {
    id: 'branch-1',
    tenantId: 'tenant-1',
    taxRate: 0.16,
  };

  const mockSupplier = {
    id: 'supplier-1',
    tenantId: 'tenant-1',
  };

  const createDto: CreatePurchaseOrderDto = {
    branchId: 'branch-1',
    supplierId: 'supplier-1',
    orderedAt: '2025-01-15T10:00:00Z',
    lines: [{ partId: 'part-1', quantity: 5, unitPrice: 100 }],
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
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const mockTransaction = jest.fn((cb) => cb(mockEntityManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PurchaseOrderItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
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
          provide: getRepositoryToken(Supplier),
          useValue: { findOne: jest.fn() },
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

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    orderRepo = module.get(getRepositoryToken(PurchaseOrder));
    itemRepo = module.get(getRepositoryToken(PurchaseOrderItem));
    branchRepo = module.get(getRepositoryToken(Branch));
    supplierRepo = module.get(getRepositoryToken(Supplier));
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

    it('debe lanzar NotFoundException cuando la sucursal no existe', async () => {
      branchRepo.findOne.mockResolvedValue(null);
      supplierRepo.findOne.mockResolvedValue(mockSupplier);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'Sucursal',
      );
    });

    it('debe lanzar NotFoundException cuando el proveedor no existe', async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch);
      supplierRepo.findOne.mockResolvedValue(null);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'Proveedor',
      );
    });

    it('debe lanzar NotFoundException cuando las partes no existen en la sucursal', async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch);
      supplierRepo.findOne.mockResolvedValue(mockSupplier);
      partRepo.find.mockResolvedValue([]);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'Parte(s) no encontrada(s)',
      );
    });

    it('debe lanzar ForbiddenException cuando el rol no puede crear órdenes', async () => {
      const userMechanic = { ...mockUser, roles: ['MECHANIC'] };

      await expect(service.create(userMechanic, createDto)).rejects.toThrow(
        'Solo WAREHOUSE y ADMIN pueden crear o modificar órdenes de compra',
      );
    });
  });

  describe('receive', () => {
    const receiveDto: ReceivePurchaseOrderDto = {
      lines: [{ itemId: 'item-1', quantityReceived: 2 }],
    };

    const mockOrder = {
      id: 'order-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      status: PurchaseOrderStatusEnum.SENT,
    };

    const mockItem = {
      id: 'item-1',
      purchaseOrderId: 'order-1',
      partId: 'part-1',
      quantity: 5,
      quantityReceived: 0,
    };

    beforeEach(() => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 'order-1' });
    });

    it('debe lanzar BadRequestException cuando la orden está en DRAFT', async () => {
      orderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: PurchaseOrderStatusEnum.DRAFT,
      });

      await expect(
        service.receive(mockUser, 'order-1', receiveDto),
      ).rejects.toThrow('Debe enviar la orden antes de recibir mercancía');
    });

    it('debe lanzar BadRequestException cuando la orden está cancelada', async () => {
      orderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: PurchaseOrderStatusEnum.CANCELLED,
      });

      await expect(
        service.receive(mockUser, 'order-1', receiveDto),
      ).rejects.toThrow('No se puede recibir una orden cancelada');
    });

    it('debe lanzar ForbiddenException cuando el rol no puede recibir', async () => {
      const userMechanic = { ...mockUser, roles: ['MECHANIC'] };
      orderRepo.findOne.mockResolvedValue(mockOrder);
      itemRepo.find.mockResolvedValue([mockItem]);

      await expect(
        service.receive(userMechanic, 'order-1', receiveDto),
      ).rejects.toThrow('Solo WAREHOUSE y ADMIN pueden crear o modificar');
    });
  });

  describe('findAll', () => {
    it('debe retornar data y meta con paginación', async () => {
      orderRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([[], 0]);

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
    it('debe lanzar NotFoundException cuando la orden no existe', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser, 'order-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
