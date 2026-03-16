import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { configureE2eApp } from './setup-e2e';
import { ScopeEnum } from '../src/modules/users/entities/user.entity';

const mockUserPayload = {
  sub: 'user-123',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  legalEntityId: 'legal-entity-1',
  roles: ['DOCUMENT_VALIDATOR'],
  scope: ScopeEnum.SUCURSAL,
};

const mockPendingDocuments = [
  {
    id: 'doc-1',
    tenantId: 'tenant-1',
    clientId: 'client-1',
    documentType: 'INE',
    name: 'documento.pdf',
    status: 'PENDING',
  },
];

describe('DocumentsPendingController (e2e)', () => {
  let app: INestApplication<App>;
  let documentsService: jest.Mocked<DocumentsService>;

  beforeAll(async () => {
    const mockFindPending = jest.fn().mockResolvedValue(mockPendingDocuments);

    const mockDocumentsService = {
      findPending: mockFindPending,
      findAllByClient: jest.fn(),
      upload: jest.fn(),
      getDownloadUrl: jest.fn(),
      delete: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
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
      .overrideProvider(DocumentsService)
      .useValue(mockDocumentsService)
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
    documentsService = moduleFixture.get(DocumentsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/documents/pending', () => {
    it('debe retornar 200 con array de documentos pendientes', () => {
      return request(app.getHttpServer())
        .get('/api/v1/documents/pending')
        .set('Authorization', 'Bearer fake-token')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(1);
          expect(res.body[0]).toMatchObject({
            id: mockPendingDocuments[0].id,
            documentType: mockPendingDocuments[0].documentType,
            status: mockPendingDocuments[0].status,
          });
        });
    });

    it('debe retornar 400 cuando clientId no es un UUID válido', () => {
      return request(app.getHttpServer())
        .get('/api/v1/documents/pending?clientId=invalid-uuid')
        .set('Authorization', 'Bearer fake-token')
        .expect(400);
    });

    it('debe llamar al service con clientId cuando se pasa como query param', async () => {
      const clientId = '550e8400-e29b-41d4-a716-446655440000';
      await request(app.getHttpServer())
        .get(`/api/v1/documents/pending?clientId=${clientId}`)
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(documentsService.findPending).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUserPayload.sub }),
        clientId,
      );
    });

    it('debe retornar 401 sin token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/documents/pending')
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
        .overrideProvider(DocumentsService)
        .useValue({
          findPending: jest.fn().mockResolvedValue([]),
          findAllByClient: jest.fn(),
          upload: jest.fn(),
          getDownloadUrl: jest.fn(),
          delete: jest.fn(),
          approve: jest.fn(),
          reject: jest.fn(),
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
        .get('/api/v1/documents/pending')
        .set('Authorization', 'Bearer fake-token')
        .expect(403);

      await testApp.close();
    });
  });
});
