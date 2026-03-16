import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import type { UserPayload } from './strategies/jwt.strategy';
import { User, RoleEnum } from '../users/entities/user.entity';
import { ScopeEnum } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let redisMock: { setex: jest.Mock; get: jest.Mock; del: jest.Mock };

  const mockUser: Partial<User> = {
    id: 'user-123',
    tenantId: 'tenant-1',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    scope: ScopeEnum.SUCURSAL,
    isActive: true,
    loginAttempts: 0,
    blockedUntil: null,
    totpEnabled: false,
    totpSecret: null,
    roles: [{ role: RoleEnum.ADMIN }] as User['roles'],
  };

  const mockDefaultBranch = {
    branchId: 'branch-1',
    legalEntityId: 'legal-entity-1',
  };

  beforeEach(async () => {
    redisMock = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findOneOrFail: jest.fn(),
            save: jest.fn(),
            getDefaultBranchForUser: jest
              .fn()
              .mockResolvedValue(mockDefaultBranch),
            getBranchesForUser: jest.fn().mockResolvedValue([]),
            getRoleNames: jest.fn().mockReturnValue(['ADMIN']),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'JWT_REFRESH_EXPIRES_IN' ? '7d' : 'secret',
            ),
          },
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('debe retornar tokens cuando las credenciales son válidas', async () => {
      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken', 'mock-token');
      expect(result).toHaveProperty('refreshToken', 'mock-token');
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
      expect(usersService.save as jest.Mock).toHaveBeenCalled();
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException cuando el usuario no existe', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Credenciales inválidas',
      );
    });

    it('debe lanzar UnauthorizedException cuando el usuario está inactivo', async () => {
      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue({ ...mockUser, isActive: false } as User);

      await expect(service.login(loginDto)).rejects.toThrow('Usuario inactivo');
    });

    it('debe lanzar UnauthorizedException cuando la contraseña es incorrecta', async () => {
      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue(mockUser as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Credenciales inválidas',
      );
      expect(usersService.save as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ loginAttempts: 1 }),
      );
    });

    it('debe lanzar UnauthorizedException cuando la cuenta está bloqueada por intentos', async () => {
      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue({ ...mockUser, loginAttempts: 5 } as User);

      await expect(service.login(loginDto)).rejects.toThrow('Account blocked');
    });

    it('debe retornar requiresTotp cuando el usuario tiene TOTP habilitado sin código', async () => {
      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue({ ...mockUser, totpEnabled: true } as User);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('requiresTotp', true);
      expect(result).toHaveProperty('message');
    });
  });

  describe('refresh', () => {
    it('debe lanzar UnauthorizedException cuando no hay refresh token', async () => {
      await expect(service.refresh('')).rejects.toThrow(
        'Refresh token requerido',
      );
    });

    it('debe retornar accessToken cuando el refresh es válido', async () => {
      jwtService.verify = jest.fn().mockReturnValue({
        sub: 'user-123',
        tenantId: 'tenant-1',
      });
      redisMock.get.mockResolvedValue('stored-refresh-token');
      usersService.findOneOrFail.mockResolvedValue(mockUser as User);
      usersService.getDefaultBranchForUser = jest
        .fn()
        .mockResolvedValue(mockDefaultBranch);

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'mock-token');
    });

    it('debe lanzar UnauthorizedException cuando el token no está en Redis', async () => {
      jwtService.verify = jest.fn().mockReturnValue({
        sub: 'user-123',
        tenantId: 'tenant-1',
      });
      redisMock.get.mockResolvedValue(null);

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('debe eliminar el refresh token de Redis', async () => {
      await service.logout('user-123');

      expect(redisMock.del).toHaveBeenCalledWith('refresh:user-123');
    });
  });

  describe('getMe', () => {
    it('debe retornar los datos del usuario autenticado', async () => {
      const userPayload = {
        sub: 'user-123',
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        legalEntityId: 'legal-entity-1',
        roles: ['ADMIN'],
        scope: ScopeEnum.SUCURSAL,
      };
      usersService.findOneOrFail.mockResolvedValue(mockUser as User);
      usersService.getDefaultBranchForUser = jest
        .fn()
        .mockResolvedValue(mockDefaultBranch);

      const result = await service.getMe(userPayload as UserPayload);

      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
    });
  });
});
