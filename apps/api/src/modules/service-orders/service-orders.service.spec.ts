import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import { CfdiService } from '../cfdi/cfdi.service';
import { ServiceOrder } from './entities/service-order.entity';
import { ReceptionChecklist } from './entities/reception-checklist.entity';
import { ReceptionPhoto } from './entities/reception-photo.entity';
import { ServiceOrderPart } from './entities/service-order-part.entity';
import { ServiceOrderUpdate } from './entities/service-order-update.entity';
import { ServiceOrderFinding } from './entities/service-order-finding.entity';
import { Client } from '../clients/entities/client.entity';
import { ServiceOrderTime } from './entities/service-order-time.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Part } from '../parts/entities/part.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { ServiceOrderStatusEnum } from './entities/service-order.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';
import { BranchesService } from '../branches/branches.service';
import { StorageService } from '../../common/storage/storage.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ServiceOrdersService', () => {
  let service: ServiceOrdersService;
  let module: TestingModule;
  let soRepo: any;

  const mockUser: UserPayload = {
    sub: 'user-123',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    legalEntityId: 'legal-entity-1',
    roles: ['CASHIER'],
    scope: ScopeEnum.SUCURSAL,
  };

  const mockServiceOrder = {
    id: 'so-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    status: ServiceOrderStatusEnum.RECEIVED,
    folio: 'OS-2025-0001',
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockServiceOrder], 1]),
    getOne: jest.fn(),
  };

  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    query: jest.fn().mockResolvedValue([{ last_value: 1 }]),
  };

  beforeEach(async () => {
    const mockTransaction = jest.fn((cb) => cb(mockEntityManager));

    module = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        {
          provide: getRepositoryToken(ServiceOrder),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(ReceptionChecklist),
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ReceptionPhoto),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(ServiceOrderPart),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(ServiceOrderTime),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Branch),
          useValue: { findOne: jest.fn() },
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
          provide: getRepositoryToken(CatalogUnit),
          useValue: { findOne: jest.fn(), update: jest.fn() },
        },
        {
          provide: getRepositoryToken(CustomerVehicle),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Appointment),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ServiceOrderUpdate),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(ServiceOrderFinding),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Client),
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
        {
          provide: BranchesService,
          useValue: {
            assertBranchInScope: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: StorageService,
          useValue: {
            upload: jest.fn().mockResolvedValue('key'),
            getSignedUrl: jest.fn().mockResolvedValue('https://signed.url'),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ServiceOrdersService>(ServiceOrdersService);
    soRepo = module.get(getRepositoryToken(ServiceOrder));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe lanzar ForbiddenException cuando el rol no puede crear OS', async () => {
      const userMechanic = { ...mockUser, roles: ['MECHANIC'] };
      const dto: CreateServiceOrderDto = {
        branchId: 'branch-1',
        ownerId: 'client-1',
        vehicleId: 'vehicle-1',
        reportedFault: 'Falla',
        kmIn: 50000,
      };

      await expect(service.create(userMechanic, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(userMechanic, dto)).rejects.toThrow(
        'Solo CASHIER y ADMIN pueden crear órdenes de servicio',
      );
    });

    it('debe lanzar NotFoundException cuando la sucursal no existe', async () => {
      const branchesService = module.get(BranchesService);
      (branchesService.assertBranchInScope as jest.Mock).mockRejectedValue(
        new NotFoundException('Sucursal branch-99 no encontrada'),
      );
      const dto: CreateServiceOrderDto = {
        branchId: 'branch-99',
        ownerId: 'client-1',
        vehicleId: 'vehicle-1',
        reportedFault: 'Falla',
        kmIn: 50000,
      };

      await expect(service.create(mockUser, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(mockUser, dto)).rejects.toThrow(
        'Sucursal branch-99 no encontrada',
      );
    });
  });

  describe('findAll', () => {
    it('debe retornar órdenes filtradas por tenant', async () => {
      const result = await service.findAll(mockUser, {});
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'so.tenant_id = :tenantId',
        { tenantId: 'tenant-1' },
      );
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException cuando la OS no existe', async () => {
      soRepo.findOne.mockResolvedValue(null);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser, 'so-99')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
