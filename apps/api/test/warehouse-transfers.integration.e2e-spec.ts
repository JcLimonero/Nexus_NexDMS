/**
 * Test de integración: usa el servicio REAL y la base de datos real.
 * Detecta errores como tablas faltantes, migraciones no ejecutadas, etc.
 *
 * Requisitos: DB con al menos un tenant. Ejecutar: npm run api:migration:run
 *
 * Ejecutar: npm run test:e2e -- warehouse-transfers.integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { configureE2eApp } from './setup-e2e';
import { ScopeEnum } from '../src/modules/users/entities/user.entity';

const mockUserPayload = {
  sub: '00000000-0000-0000-0000-000000000001',
  tenantId: '00000000-0000-0000-0000-000000000001',
  branchId: '00000000-0000-0000-0000-000000000001',
  legalEntityId: '00000000-0000-0000-0000-000000000001',
  roles: ['SUPERADMIN'],
  scope: ScopeEnum.GLOBAL,
};

describe('WarehouseTransfersController (integration - real DB)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const mockAuthGuard = {
      canActivate: jest.fn((context) => {
        const req = context.switchToHttp().getRequest();
        req.user = { ...mockUserPayload };
        return true;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
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
    configureE2eApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/warehouse-transfers debe retornar 200 (no 500)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/warehouse-transfers?page=1&limit=20')
      .expect((r) => {
        if (r.status === 500) {
          const msg =
            typeof r.body?.message === 'string'
              ? r.body.message
              : JSON.stringify(r.body);
          throw new Error(`500 recibido: ${msg}`);
        }
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });
});
