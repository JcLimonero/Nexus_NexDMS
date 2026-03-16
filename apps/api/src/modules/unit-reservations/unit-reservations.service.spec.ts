import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UnitReservationsService } from './unit-reservations.service';
import { UnitReservation } from './entities/unit-reservation.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateUnitReservationDto } from './dto/create-unit-reservation.dto';
import { UnitReservationStatusEnum } from './entities/unit-reservation.entity';
import { CatalogUnitStatusEnum } from '../catalog-units/entities/catalog-unit.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

describe('UnitReservationsService', () => {
  let service: UnitReservationsService;

  const mockUser: UserPayload = {
    sub: 'user-123',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    legalEntityId: 'legal-entity-1',
    roles: ['SELLER'],
    scope: ScopeEnum.SUCURSAL,
  };

  const createDto: CreateUnitReservationDto = {
    catalogUnitId: 'unit-1',
    clientId: 'client-1',
    advanceAmount: 5000,
  };

  const mockUnit = {
    id: 'unit-1',
    tenantId: 'tenant-1',
    status: CatalogUnitStatusEnum.AVAILABLE,
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
  };

  beforeEach(async () => {
    const mockTransaction = jest.fn((cb) => cb(mockEntityManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitReservationsService,
        {
          provide: getRepositoryToken(UnitReservation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
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
          provide: DataSource,
          useValue: {
            transaction: mockTransaction,
            manager: mockEntityManager,
          },
        },
      ],
    }).compile();

    service = module.get<UnitReservationsService>(UnitReservationsService);

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

    it('debe lanzar BadRequestException cuando la unidad no está disponible', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        ...mockUnit,
        status: CatalogUnitStatusEnum.RESERVED,
      });

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'La unidad no está disponible',
      );
    });

    it('debe lanzar BadRequestException cuando ya existe un apartado activo', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUnit)
        .mockResolvedValueOnce({
          id: 'res-1',
          status: UnitReservationStatusEnum.ACTIVE,
        });

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'Ya existe un apartado activo para esta unidad',
      );
    });

    it('debe lanzar NotFoundException cuando el cliente no existe', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUnit)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        'Cliente no encontrado',
      );
    });

    it('debe lanzar ForbiddenException cuando el rol no puede crear apartados', async () => {
      const userMechanic = { ...mockUser, roles: ['MECHANIC'] };

      await expect(service.create(userMechanic, createDto)).rejects.toThrow(
        'Solo SELLER, MANAGER y ADMIN pueden crear apartados',
      );
    });
  });

  describe('release', () => {
    const mockReservation = {
      id: 'res-1',
      catalogUnitId: 'unit-1',
      status: UnitReservationStatusEnum.ACTIVE,
    };

    beforeEach(() => {
      mockQueryBuilder.getOne.mockResolvedValue(mockReservation);
    });

    it('debe lanzar BadRequestException cuando el apartado no está activo', async () => {
      const userManager = { ...mockUser, roles: ['MANAGER'] };
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockReservation,
        status: UnitReservationStatusEnum.RELEASED,
      });

      await expect(
        service.release(userManager, 'res-1', 'Motivo'),
      ).rejects.toThrow('Solo se pueden liberar apartados activos');
    });

    it('debe lanzar ForbiddenException cuando el rol no puede liberar', async () => {
      const userSeller = { ...mockUser, roles: ['SELLER'] };

      await expect(
        service.release(userSeller, 'res-1', 'Motivo'),
      ).rejects.toThrow('Solo MANAGER y ADMIN pueden liberar apartados');
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException cuando el apartado no existe', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser, 'res-1')).rejects.toThrow(
        'Apartado',
      );
    });
  });
});
