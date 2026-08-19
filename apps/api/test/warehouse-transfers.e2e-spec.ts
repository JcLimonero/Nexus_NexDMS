import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { WarehouseTransfersService } from '../src/modules/warehouse-transfers/warehouse-transfers.service';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { ScopeEnum } from '../src/modules/users/entities/user.entity';

const mockUserPayload = {
  sub: 'user-123',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  legalEntityId: 'legal-entity-1',
  roles: ['WAREHOUSE'],
  scope: ScopeEnum.SUCURSAL,
};

describe('WarehouseTransfersController (e2e)', () => {
  let app: INestApplication<App>;

  const mockFindAllResponse = {
    data: [],
    meta: {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    },
  };

  beforeAll(async () => {
    const mockWarehouseTransfersService = {
      findAll: jest.fn().mockResolvedValue(mockFindAllResponse),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      send: jest.fn(),
      receive: jest.fn(),
      cancel: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: jest.fn((context) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockUserPayload;
        return true;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WarehouseTransfersService)
      .useValue(mockWarehouseTransfersService)
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideProvider('REDIS_CLIENT')
      .useValue({
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(1),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /warehouse-transfers', () => {
    it('debe retornar 200 con data y meta (listado)', () => {
      return request(app.getHttpServer())
        .get('/warehouse-transfers')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toMatchObject({
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          });
        });
    });

    it('debe aceptar query params de filtrado', () => {
      return request(app.getHttpServer())
        .get('/warehouse-transfers?page=2&limit=10&status=PENDING')
        .expect(200);
    });
  });

  describe('GET /warehouse-transfers/:id', () => {
    it('debe retornar 400 para id inválido (no UUID)', () => {
      return request(app.getHttpServer())
        .get('/warehouse-transfers/invalid-id')
        .expect(400);
    });
  });
});
