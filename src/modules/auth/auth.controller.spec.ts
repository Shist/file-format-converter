import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<Record<keyof AuthService, jest.Mock>>;
  let otpService: Partial<Record<keyof OtpService, jest.Mock>>;

  const mockReply = {
    setCookie: jest.fn(),
  } as unknown as FastifyReply;

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
      login: jest.fn(),
      passwordlessLogin: jest.fn(),
      refreshToken: jest.fn(),
    };

    otpService = {
      generateAndSendOtp: jest.fn(),
      verifyOtp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: OtpService, useValue: otpService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should validate user, generate tokens and set cookies', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      const mockTokens = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: mockUser,
      };

      authService.validateUser?.mockResolvedValue(mockUser);
      authService.login?.mockReturnValue(mockTokens);

      const result = await controller.login(
        { email: 'test@test.com', password: 'password' },
        mockReply,
      );

      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@test.com',
        'password',
      );
      expect(mockReply.setCookie).toHaveBeenCalledTimes(2);
      expect(result.message).toBe('Successful login');
      expect(result.user).toEqual(mockUser);
    });

    it('should throw TypeError on invalid credentials when tokens are undefined', async () => {
      authService.validateUser?.mockResolvedValue(null);
      await expect(
        controller.login(
          { email: 'test@test.com', password: 'wrong' },
          mockReply,
        ),
      ).rejects.toThrow(TypeError);
    });
  });

  describe('requestOtp', () => {
    it('should request OTP', async () => {
      otpService.generateAndSendOtp?.mockResolvedValue(undefined);

      const result = await controller.requestOtp({ email: 'test@test.com' });

      expect(otpService.generateAndSendOtp).toHaveBeenCalledWith(
        'test@test.com',
      );
      expect(result.message).toBeDefined();
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and perform passwordless login', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      const mockTokens = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: mockUser,
      };

      otpService.verifyOtp?.mockResolvedValue(true);
      authService.passwordlessLogin?.mockResolvedValue(mockTokens);

      const result = await controller.verifyOtp(
        { email: 'test@test.com', code: '123456' },
        mockReply,
      );

      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        'test@test.com',
        '123456',
      );
      expect(authService.passwordlessLogin).toHaveBeenCalledWith(
        'test@test.com',
      );
      expect(mockReply.setCookie).toHaveBeenCalledTimes(2);
      expect(result.message).toBeDefined();
    });

    it('should throw TypeError on invalid OTP when tokens are undefined', async () => {
      otpService.verifyOtp?.mockResolvedValue(false);
      authService.passwordlessLogin?.mockResolvedValue(undefined);

      await expect(
        controller.verifyOtp(
          { email: 'test@test.com', code: 'wrong' },
          mockReply,
        ),
      ).rejects.toThrow(TypeError);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and set cookies', async () => {
      const mockRequest = {
        cookies: { refresh_token: 'valid-token' },
      } as unknown as FastifyRequest;
      const mockTokens = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: { id: '1' },
      };

      authService.refreshToken?.mockResolvedValue(mockTokens);

      const result = await controller.refresh(mockRequest, mockReply);

      expect(authService.refreshToken).toHaveBeenCalledWith('valid-token');
      expect(mockReply.setCookie).toHaveBeenCalledTimes(2);
      expect(result.message).toBeDefined();
    });

    it('should throw UnauthorizedException if refresh token is missing', async () => {
      const mockRequest = { cookies: {} } as unknown as FastifyRequest;

      await expect(controller.refresh(mockRequest, mockReply)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
