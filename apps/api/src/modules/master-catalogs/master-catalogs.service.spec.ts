import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MasterCatalogsService } from './master-catalogs.service';
import { MASTER_TENANT_ID } from '../../common/tenancy/master-tenant.const';

/**
 * Pruebas del gestor de catálogos maestros (Fase 1) y de la copia al alta
 * (Fase 3). Se mockea el DataSource: getRepository devuelve un repo espía.
 */
describe('MasterCatalogsService', () => {
  let service: MasterCatalogsService;
  let repo: {
    count: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      count: jest.fn().mockResolvedValue(3),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterCatalogsService,
        {
          provide: DataSource,
          useValue: { getRepository: jest.fn().mockReturnValue(repo) },
        },
      ],
    }).compile();

    service = module.get(MasterCatalogsService);
  });

  describe('listarCatalogos', () => {
    it('devuelve los catálogos con sus campos y el conteo', async () => {
      const cats = await service.listarCatalogos();
      expect(cats.length).toBeGreaterThanOrEqual(5);
      const keys = cats.map((c) => c.key);
      expect(keys).toContain('service-types');
      expect(keys).toContain('part-categories');
      cats.forEach((c) => {
        expect(c.count).toBe(3);
        expect(Array.isArray(c.fields)).toBe(true);
      });
    });
  });

  describe('crear', () => {
    it('rechaza catálogo inexistente', async () => {
      await expect(service.crear('no-existe', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('exige los campos requeridos', async () => {
      // part-categories requiere "name"
      await expect(
        service.crear('part-categories', { description: 'x' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('solo persiste campos de la lista blanca y fija el tenant maestro', async () => {
      await service.crear('part-categories', {
        name: 'Frenos',
        description: 'Base',
        isActive: true,
        hackeo: 'no-debe-entrar',
      });
      const arg = repo.create.mock.calls[0][0];
      expect(arg).toMatchObject({
        name: 'Frenos',
        description: 'Base',
        isActive: true,
        tenantId: MASTER_TENANT_ID,
      });
      expect(arg).not.toHaveProperty('hackeo');
      expect(repo.save).toHaveBeenCalled();
    });

    it('en catálogos con sucursal la deja en null (nivel empresa)', async () => {
      await service.crear('service-types', {
        code: 'AFIN',
        name: 'Afinación',
        category: 'MAINTENANCE',
      });
      const arg = repo.create.mock.calls[0][0];
      expect(arg.branchId).toBeNull();
      expect(arg.tenantId).toBe(MASTER_TENANT_ID);
    });

    it('convierte tipos (number/boolean)', async () => {
      await service.crear('service-types', {
        code: 'X',
        name: 'X',
        category: 'OTHER',
        durationMin: '90',
        isActive: 0,
      });
      const arg = repo.create.mock.calls[0][0];
      expect(arg.durationMin).toBe(90);
      expect(arg.isActive).toBe(false);
    });
  });

  describe('eliminar', () => {
    it('falla si la entrada no existe en el maestro', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.eliminar('part-categories', 'x'),
      ).rejects.toThrow(NotFoundException);
    });

    it('elimina la entrada existente', async () => {
      const fila = { id: 'x', tenantId: MASTER_TENANT_ID };
      repo.findOne.mockResolvedValue(fila);
      await service.eliminar('part-categories', 'x');
      expect(repo.remove).toHaveBeenCalledWith(fila);
    });
  });

  describe('copiar (Fase 3)', () => {
    it('copia TODO el catálogo clonando filas al tenant destino sin id', async () => {
      repo.find.mockResolvedValue([
        { id: 'a', name: 'Frenos', tenantId: MASTER_TENANT_ID, createdAt: 1, updatedAt: 2 },
        { id: 'b', name: 'Suspensión', tenantId: MASTER_TENANT_ID, createdAt: 1, updatedAt: 2 },
      ]);
      const res = await service.copiar('dest-1', [
        { key: 'part-categories', all: true },
      ]);
      expect(res).toEqual([{ key: 'part-categories', copiadas: 2 }]);
      const primero = repo.create.mock.calls[0][0];
      expect(primero.tenantId).toBe('dest-1');
      expect(primero).not.toHaveProperty('id');
      expect(primero).not.toHaveProperty('createdAt');
      expect(repo.save).toHaveBeenCalled();
    });

    it('con ids vacíos no copia nada ni consulta', async () => {
      const res = await service.copiar('dest-1', [
        { key: 'part-categories', ids: [] },
      ]);
      expect(res).toEqual([{ key: 'part-categories', copiadas: 0 }]);
      expect(repo.find).not.toHaveBeenCalled();
    });

    it('en catálogo con sucursal, la copia queda a nivel empresa (branchId null)', async () => {
      repo.find.mockResolvedValue([
        { id: 'a', name: 'Afinación', branchId: 'br-maestro', tenantId: MASTER_TENANT_ID },
      ]);
      await service.copiar('dest-1', [{ key: 'service-types', ids: ['a'] }]);
      const clon = repo.create.mock.calls[0][0];
      expect(clon.branchId).toBeNull();
      expect(clon.tenantId).toBe('dest-1');
    });
  });
});
