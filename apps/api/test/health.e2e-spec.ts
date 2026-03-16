import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('REDIS_CLIENT')
      .useValue({
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        ping: jest.fn().mockResolvedValue('PONG'),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /api/v1/health', () => {
    it('debe retornar 200 en liveness', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
        });
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('debe retornar 200 o 503 en readiness', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });
    });
  });
});
