import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let authService: jest.Mocked<AuthService>;

  const mockLoginResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'user-123',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      roles: ['ADMIN'],
      scope: 'BRANCH',
      legalEntityId: 'legal-entity-1',
    },
  };

  beforeAll(async () => {
    const mockAuthService = {
      login: jest.fn().mockResolvedValue(mockLoginResponse),
      refresh: jest.fn().mockResolvedValue({ accessToken: 'new-token' }),
      logout: jest.fn().mockResolvedValue(undefined),
      changePassword: jest.fn().mockResolvedValue(undefined),
      getMe: jest.fn().mockResolvedValue(mockLoginResponse.user),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .overrideProvider('REDIS_CLIENT')
      .useValue({
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(1),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    authService = moduleFixture.get(AuthService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('debe retornar 200 con tokens y usuario cuando las credenciales son válidas', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'accessToken',
            mockLoginResponse.accessToken,
          );
          expect(res.body).toHaveProperty(
            'refreshToken',
            mockLoginResponse.refreshToken,
          );
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toMatchObject({
            id: mockLoginResponse.user.id,
            email: mockLoginResponse.user.email,
          });
        });
    });

    it('debe llamar al AuthService.login con el body recibido', async () => {
      const body = { email: 'user@test.com', password: 'secret' };
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(body)
        .expect(200);

      expect(authService.login as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ email: body.email, password: body.password }),
      );
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('debe retornar 200 con accessToken', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
        });
    });
  });
});
