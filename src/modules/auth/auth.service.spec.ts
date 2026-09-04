import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findOneById: jest.fn(),
    };

    jwtService = {
      sign: jest
        .fn()
        .mockImplementation(
          (payload: { sub: string }) => `token-${payload.sub}`,
        ),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without passwordHash if credentials are valid', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        passwordHash: 'hash',
      } as User;
      usersService.findByEmail?.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password');

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@test.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hash');
      expect(result).not.toHaveProperty('passwordHash');
      expect((result as User).id).toBe('1');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByEmail?.mockResolvedValue(null);

      await expect(
        service.validateUser('notfound@test.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        passwordHash: 'hash',
      } as User;
      usersService.findByEmail?.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@test.com', 'wrong-pass'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', () => {
      const user = {
        id: '1',
        email: 'test@test.com',
        role: { name: 'user' },
      } as User;
      const result = service.login(user);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBe('token-1');
      expect(result.refreshToken).toBe('token-1');
      expect(result.user).toEqual(user);
    });
  });

  describe('passwordlessLogin', () => {
    it('should login if user exists', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        passwordHash: 'hash',
      } as User;
      usersService.findByEmail?.mockResolvedValue(mockUser);

      const result = await service.passwordlessLogin('test@test.com');

      expect(result.accessToken).toBe('token-1');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      usersService.findByEmail?.mockResolvedValue(null);

      await expect(
        service.passwordlessLogin('notfound@test.com'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should issue new tokens if refresh token is valid', async () => {
      jwtService.verify?.mockReturnValue({ sub: '1' });
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        passwordHash: 'hash',
      } as User;
      usersService.findOneById?.mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid-refresh-token');

      expect(jwtService.verify).toHaveBeenCalledWith(
        'valid-refresh-token',
        expect.any(Object),
      );
      expect(usersService.findOneById).toHaveBeenCalledWith('1');
      expect(result.accessToken).toBe('token-1');
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      jwtService.verify?.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
