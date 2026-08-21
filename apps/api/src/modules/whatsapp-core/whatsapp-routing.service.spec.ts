import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { BranchConfig } from '../branches/entities/branch-config.entity';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import { WhatsappRoutingService } from './whatsapp-routing.service';

const PHONE_NUMBER_ID = '123456789012345';

const BRANCH = {
  id: 'branch-1',
  tenantId: 'tenant-1',
  slug: 'central',
  name: 'Sucursal Central',
};

describe('WhatsappRoutingService', () => {
  let service: WhatsappRoutingService;
  let branchRepo: { findOne: jest.Mock };
  let configRepo: { findOne: jest.Mock };
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappRoutingService,
        { provide: 'REDIS_CLIENT', useValue: redis },
        {
          provide: getRepositoryToken(Branch),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(BranchConfig),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn((v: string) => `encrypted:${v}`),
            decrypt: jest.fn((v: string) => {
              if (!v.startsWith('encrypted:')) throw new Error('ilegible');
              return v.replace('encrypted:', '');
            }),
          },
        },
      ],
    }).compile();

    service = module.get(WhatsappRoutingService);
    branchRepo = module.get(getRepositoryToken(Branch));
    configRepo = module.get(getRepositoryToken(BranchConfig));
  });

  describe('resolve', () => {
    it('devuelve el tenant y la sucursal dueños del número', async () => {
      configRepo.findOne.mockResolvedValue({
        id: 'cfg-1',
        branchId: BRANCH.id,
        whatsappPhoneNumberId: PHONE_NUMBER_ID,
      });
      branchRepo.findOne.mockResolvedValue(BRANCH);

      await expect(service.resolve(PHONE_NUMBER_ID)).resolves.toEqual({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        branchSlug: 'central',
        branchName: 'Sucursal Central',
        phoneNumberId: PHONE_NUMBER_ID,
      });
    });

    it('devuelve null si el número no está dado de alta en ninguna sucursal', async () => {
      configRepo.findOne.mockResolvedValue(null);

      await expect(service.resolve('numero-ajeno')).resolves.toBeNull();
      // Sin sucursal no se busca nada más: el mensaje simplemente no se procesa.
      expect(branchRepo.findOne).not.toHaveBeenCalled();
    });

    it('sirve la ruta cacheada sin volver a la base', async () => {
      const cached = {
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        branchSlug: 'central',
        branchName: 'Sucursal Central',
        phoneNumberId: PHONE_NUMBER_ID,
      };
      redis.get.mockResolvedValue(JSON.stringify(cached));

      await expect(service.resolve(PHONE_NUMBER_ID)).resolves.toEqual(cached);
      expect(configRepo.findOne).not.toHaveBeenCalled();
    });

    it('resuelve por base cuando Redis está caído', async () => {
      redis.get.mockRejectedValue(new Error('sin redis'));
      redis.set.mockRejectedValue(new Error('sin redis'));
      configRepo.findOne.mockResolvedValue({
        id: 'cfg-1',
        branchId: BRANCH.id,
        whatsappPhoneNumberId: PHONE_NUMBER_ID,
      });
      branchRepo.findOne.mockResolvedValue(BRANCH);

      const route = await service.resolve(PHONE_NUMBER_ID);
      expect(route?.branchId).toBe('branch-1');
    });
  });

  describe('credentialsFor', () => {
    it('descifra el token de la sucursal', async () => {
      configRepo.findOne.mockResolvedValue({
        branchId: BRANCH.id,
        whatsappPhoneNumberId: PHONE_NUMBER_ID,
        whatsappToken: 'encrypted:token-real',
      });

      await expect(service.credentialsFor(BRANCH.id)).resolves.toEqual({
        phoneNumberId: PHONE_NUMBER_ID,
        token: 'token-real',
      });
    });

    it('devuelve null si la sucursal no tiene WhatsApp configurado', async () => {
      configRepo.findOne.mockResolvedValue({
        branchId: BRANCH.id,
        whatsappPhoneNumberId: null,
        whatsappToken: null,
      });

      await expect(service.credentialsFor(BRANCH.id)).resolves.toBeNull();
    });

    it('devuelve null —y no revienta— si el token no se puede descifrar', async () => {
      configRepo.findOne.mockResolvedValue({
        branchId: BRANCH.id,
        whatsappPhoneNumberId: PHONE_NUMBER_ID,
        whatsappToken: 'basura-sin-cifrar',
      });

      await expect(service.credentialsFor(BRANCH.id)).resolves.toBeNull();
    });
  });
});
