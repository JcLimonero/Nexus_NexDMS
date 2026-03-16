import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/users/users.service';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { configureE2eApp } from './setup-e2e';
import { ScopeEnum } from '../src/modules/users/entities/user.entity';

const mockUserPayload = {
  sub: 'user-123',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  legalEntityId: 'legal-entity-1',
  roles: ['ADMIN'],
  scope: ScopeEnum.BRANCH,
};

const validCreateUserBody = {
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan.perez@test.com',
  password: 'password123',
  roles: ['ADMIN'],
  scope: ScopeEnum.BRANCH,
  branchIds: ['550e8400-e29b-41d4-a716-446655440000'],
};

const mockCreatedUser = {
  id: 'user-new-id',
  tenantId: 'tenant-1',
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan.perez@test.com',
  scope: ScopeEnum.BRANCH,
  isActive: true,
};

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const mockUsersService = {
      create: jest.fn().mockResolvedValue(mockCreatedUser),
      findByEmail: jest.fn(),
      findOneOrFail: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: jest.fn((context) => {
        const req = context.switchToHttp().getRequest();
        if (!req.headers['authorization']) {
          throw new UnauthorizedException('No se proporcionó token');
        }
        req.user = { ...mockUserPayload };
        return true;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
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

  describe('POST /api/v1/users', () => {
    it('debe retornar 201 con usuario creado cuando el body es válido', () => {
      return request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', 'Bearer fake-token')
        .send(validCreateUserBody)
        .expect(201)
        .expect((res) => {
          expect(res.body).toMatchObject({
            id: mockCreatedUser.id,
            email: mockCreatedUser.email,
            firstName: mockCreatedUser.firstName,
            lastName: mockCreatedUser.lastName,
          });
        });
    });

    it('debe retornar 400 cuando roles está vacío', () => {
      return request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', 'Bearer fake-token')
        .send({
          ...validCreateUserBody,
          roles: [],
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
          const messages = Array.isArray(res.body.message)
            ? res.body.message
            : [res.body.message];
          expect(
            messages.some((m: string) =>
              String(m).includes('Debe asignar al menos un rol'),
            ),
          ).toBe(true);
        });
    });

    it('debe retornar 401 sin token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/users')
        .send(validCreateUserBody)
        .expect(401);
    });

    it('debe retornar 403 con rol no autorizado', async () => {
      const mockAuthGuardForbidden = {
        canActivate: jest.fn((context) => {
          const req = context.switchToHttp().getRequest();
          if (!req.headers['authorization']) {
            throw new UnauthorizedException('No se proporcionó token');
          }
          req.user = { ...mockUserPayload, roles: ['WAREHOUSE'] };
          return true;
        }),
      };

      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(UsersService)
        .useValue({
          create: jest.fn().mockResolvedValue(mockCreatedUser),
          findByEmail: jest.fn(),
          findOneOrFail: jest.fn(),
          findAll: jest.fn(),
          update: jest.fn(),
        })
        .overrideGuard(AuthGuard)
        .useValue(mockAuthGuardForbidden)
        .overrideProvider('REDIS_CLIENT')
        .useValue({
          setex: jest.fn().mockResolvedValue('OK'),
          get: jest.fn().mockResolvedValue(null),
          del: jest.fn().mockResolvedValue(1),
        })
        .compile();

      const testApp = moduleFixture.createNestApplication();
      configureE2eApp(testApp);
      await testApp.init();

      await request(testApp.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', 'Bearer fake-token')
        .send(validCreateUserBody)
        .expect(403);

      await testApp.close();
    });
  });
});
