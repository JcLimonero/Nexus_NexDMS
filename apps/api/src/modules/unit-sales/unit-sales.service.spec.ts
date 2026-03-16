import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UnitSalesService } from './unit-sales.service';
import { CfdiService } from '../cfdi/cfdi.service';
import { UnitSale } from './entities/unit-sale.entity';
import { PaymentPlan } from './entities/payment-plan.entity';
import { PaymentPlanInstallment } from './entities/payment-plan-installment.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { Client } from '../clients/entities/client.entity';
import { UnitReservation } from '../unit-reservations/entities/unit-reservation.entity';
import { CreateUnitSaleDto } from './dto/create-unit-sale.dto';
import {
  UnitSaleStatusEnum,
  UnitSaleFinancingTypeEnum,
} from './entities/unit-sale.entity';
import { CatalogUnitStatusEnum } from '../catalog-units/entities/catalog-unit.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

describe('UnitSalesService', () => {
  let service: UnitSalesService;
  let planRepo: any;

  const mockUser: UserPayload = {
    sub: 'user-123',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    brandId: null,
    role: 'SELLER',
    scope: ScopeEnum.BRANCH,
  };

  const createDto: CreateUnitSaleDto = {
    catalogUnitId: 'unit-1',
    clientId: 'client-1',
    finalPrice: 150000,
    downPayment: 50000,
    financingType: UnitSaleFinancingTypeEnum.CASH,
  };

  const mockUnit = {
    id: 'unit-1',
    tenantId: 'tenant-1',
    status: CatalogUnitStatusEnum.AVAILABLE,
    listPrice: 160000,
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn(),
  };

  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const mockTransaction = jest.fn((cb) => cb(mockEntityManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitSalesService,
        {
          provide: getRepositoryToken(UnitSale),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(PaymentPlan),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PaymentPlanInstallment),
          useValue: { save: jest.fn(), findOne: jest.fn(), count: jest.fn() },
        },
        {
          provide: getRepositoryToken(CatalogUnit),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Client),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(UnitReservation),
          useValue: { findOne: jest.fn() },
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

    service = module.get<UnitSalesService>(UnitSalesService);
    planRepo = module.get(getRepositoryToken(PaymentPlan));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe lanzar NotFoundException cuando la unidad no existe', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'Unidad no encontrada',
      );
    });

    it('debe lanzar BadRequestException cuando la unidad ya está vendida', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        ...mockUnit,
        status: CatalogUnitStatusEnum.SOLD,
      });

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'La unidad ya está vendida',
      );
    });

    it('debe lanzar NotFoundException cuando el cliente no existe', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUnit)
        .mockResolvedValueOnce(null);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'Cliente no encontrado',
      );
    });

    it('debe lanzar ForbiddenException cuando el rol no puede crear ventas', async () => {
      const userMechanic = { ...mockUser, role: 'MECHANIC' };

      await expect(service.create(userMechanic, createDto)).rejects.toThrow(
        'Solo SELLER, MANAGER y ADMIN pueden gestionar ventas de unidades',
      );
    });
  });

  describe('complete', () => {
    const mockSale = {
      id: 'sale-1',
      catalogUnitId: 'unit-1',
      status: UnitSaleStatusEnum.IN_PROGRESS,
      financingType: UnitSaleFinancingTypeEnum.CASH,
    };

    beforeEach(() => {
      mockQueryBuilder.getOne.mockResolvedValue(mockSale);
    });

    it('debe lanzar BadRequestException cuando la venta no está en proceso', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockSale,
        status: UnitSaleStatusEnum.COMPLETED,
      });

      await expect(service.complete(mockUser, 'sale-1')).rejects.toThrow(
        'Solo se pueden completar ventas en proceso',
      );
    });

    it('debe lanzar BadRequestException cuando es crédito agencia sin plan de pago', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockSale,
        financingType: UnitSaleFinancingTypeEnum.AGENCY_CREDIT,
      });
      planRepo.findOne.mockResolvedValue(null);

      await expect(service.complete(mockUser, 'sale-1')).rejects.toThrow(
        'Para crédito agencia debe existir un plan de pago creado',
      );
    });

    it('debe lanzar ForbiddenException cuando el rol no puede completar', async () => {
      const userMechanic = { ...mockUser, role: 'MECHANIC' };

      await expect(service.complete(userMechanic, 'sale-1')).rejects.toThrow(
        'Solo SELLER, MANAGER y ADMIN pueden gestionar ventas de unidades',
      );
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException cuando la venta no existe', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser, 'sale-1')).rejects.toThrow(
        'Venta de unidad',
      );
    });
  });
});
