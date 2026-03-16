import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  AppointmentStatusEnum,
  AppointmentOriginEnum,
} from './entities/appointment.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let appointmentRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let branchRepo: { findOne: jest.Mock };

  const mockUser: UserPayload = {
    sub: 'user-123',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    brandId: null,
    role: 'CASHIER',
    scope: ScopeEnum.BRANCH,
  };

  const mockBranch = {
    id: 'branch-1',
    tenantId: 'tenant-1',
    slug: 'norte',
  };

  const mockAppointment = {
    id: 'apt-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    status: AppointmentStatusEnum.PENDING_CONFIRMATION,
    origin: AppointmentOriginEnum.INTERNAL,
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockAppointment], 1]),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Branch),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Client),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    appointmentRepo = module.get(getRepositoryToken(Appointment));
    branchRepo = module.get(getRepositoryToken(Branch));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe lanzar ForbiddenException cuando el rol no puede crear citas', async () => {
      const userMechanic = { ...mockUser, role: 'MECHANIC' };
      const dto: CreateAppointmentDto = {
        branchId: 'branch-1',
        origin: AppointmentOriginEnum.INTERNAL,
        serviceType: 'GENERAL',
        clientName: 'Juan',
        clientPhone: '8180000000',
        scheduledAt: new Date().toISOString(),
      };

      await expect(service.create(userMechanic, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(userMechanic, dto)).rejects.toThrow(
        'Solo CASHIER y ADMIN pueden crear citas internas',
      );
    });

    it('debe lanzar NotFoundException cuando la sucursal no existe', async () => {
      branchRepo.findOne.mockResolvedValue(null);
      const dto: CreateAppointmentDto = {
        branchId: 'branch-99',
        origin: AppointmentOriginEnum.INTERNAL,
        serviceType: 'GENERAL',
        clientName: 'Juan',
        clientPhone: '8180000000',
        scheduledAt: new Date().toISOString(),
      };

      await expect(service.create(mockUser, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(mockUser, dto)).rejects.toThrow(
        'Sucursal no encontrada',
      );
    });

    it('debe crear cita cuando los datos son válidos', async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch);
      const dto: CreateAppointmentDto = {
        branchId: 'branch-1',
        origin: AppointmentOriginEnum.INTERNAL,
        serviceType: 'GENERAL',
        clientName: 'Juan Pérez',
        clientPhone: '8180000000',
        scheduledAt: new Date().toISOString(),
      };

      const created = { ...mockAppointment, ...dto };
      appointmentRepo.create.mockReturnValue(created);
      appointmentRepo.save.mockResolvedValue(created);

      const result = await service.create(mockUser, dto);
      expect(result).toEqual(created);
      expect(appointmentRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('debe retornar citas filtradas por tenant', async () => {
      const result = await service.findAll(mockUser, {});
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toEqual([mockAppointment]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'a.tenant_id = :tenantId',
        { tenantId: 'tenant-1' },
      );
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException cuando la cita no existe', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser, 'apt-99')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
