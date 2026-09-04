import { Test, TestingModule } from '@nestjs/testing';
import type { FastifyReply } from 'fastify';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { OtpService } from '../auth/otp.service';
import { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let otpService: Partial<Record<keyof OtpService, jest.Mock>>;

  const clearCookieMock = jest.fn();
  const mockReply = {
    clearCookie: clearCookieMock,
  } as unknown as FastifyReply;

  const mockActiveUser: ActiveUserData = {
    id: '1',
    email: 'test@test.com',
    role: 'user',
  };
  const mockAdminUser: ActiveUserData = {
    id: '2',
    email: 'admin@test.com',
    role: 'admin',
  };

  beforeEach(async () => {
    usersService = {
      findOneById: jest.fn(),
      update: jest.fn(),
      checkEmailAvailability: jest.fn(),
      updateEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };

    otpService = {
      generateAndSendOtp: jest.fn(),
      verifyOtp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: OtpService, useValue: otpService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      usersService.findOneById?.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
      });
      const result = await controller.getProfile('1');
      expect(usersService.findOneById).toHaveBeenCalledWith('1');
      expect(result.id).toBe('1');
    });

    it('should return null if user not found', async () => {
      usersService.findOneById?.mockResolvedValue(null);
      const result = await controller.getProfile('999');
      expect(result).toBeNull();
    });
  });

  describe('updateSelf', () => {
    it('should update profile but ignore role', async () => {
      usersService.update?.mockResolvedValue({ id: '1' });
      await controller.updateSelf('1', { password: 'new', role: 'admin' });

      expect(usersService.update).toHaveBeenCalledWith('1', {
        password: 'new',
      });
    });

    it('should return null if user not found for update', async () => {
      usersService.update?.mockResolvedValue(null);
      const result = await controller.updateSelf('999', { password: 'new' });
      expect(result).toBeNull();
    });
  });

  describe('requestEmailChange', () => {
    it('should check availability and send OTP', async () => {
      usersService.checkEmailAvailability?.mockResolvedValue(undefined);
      otpService.generateAndSendOtp?.mockResolvedValue(undefined);

      await controller.requestEmailChange({ newEmail: 'new@test.com' });

      expect(usersService.checkEmailAvailability).toHaveBeenCalledWith(
        'new@test.com',
      );
      expect(otpService.generateAndSendOtp).toHaveBeenCalledWith(
        'new@test.com',
      );
    });
  });

  describe('verifyEmailChange', () => {
    it('should verify OTP and update email', async () => {
      otpService.verifyOtp?.mockResolvedValue(true);
      usersService.updateEmail?.mockResolvedValue({
        id: '1',
        email: 'new@test.com',
      });

      const result = await controller.verifyEmailChange('1', {
        newEmail: 'new@test.com',
        code: '123',
      });

      expect(otpService.verifyOtp).toHaveBeenCalledWith('new@test.com', '123');
      expect(usersService.updateEmail).toHaveBeenCalledWith(
        '1',
        'new@test.com',
      );
      expect(result.message).toBeDefined();
    });

    it('should attempt OTP verification for email change', async () => {
      otpService.verifyOtp?.mockResolvedValue(false);
      const result = await controller.verifyEmailChange('1', {
        newEmail: 'new@test.com',
        code: 'wrong',
      });
      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        'new@test.com',
        'wrong',
      );
      expect(result).toBeDefined();
    });
  });

  describe('getUsers', () => {
    it('should return mapped items (masking emails for non-admins)', async () => {
      const mockResult = {
        items: [{ id: '3', email: 'target@test.com', createdAt: new Date() }],
        nextCursor: null,
      };
      usersService.findAll?.mockResolvedValue(mockResult);

      const result = await controller.getUsers(
        { limit: 10, sort: 'createdAt', order: 'DESC' },
        mockActiveUser,
      );

      expect(result.items[0].email).toBe('ta***@test.com');
    });

    it('should return full items for admins', async () => {
      const mockResult = {
        items: [{ id: '3', email: 'target@test.com', createdAt: new Date() }],
        nextCursor: null,
      };
      usersService.findAll?.mockResolvedValue(mockResult);

      const result = await controller.getUsers(
        { limit: 10, sort: 'createdAt', order: 'DESC' },
        mockAdminUser,
      );

      expect(result.items[0].email).toBe('target@test.com');
    });
  });

  describe('findOne', () => {
    it('should return mapped user', async () => {
      usersService.findOneById?.mockResolvedValue({
        id: '2',
        email: 'target@test.com',
        createdAt: new Date(),
      });

      const result = await controller.findOne('2', mockAdminUser);
      expect(result.email).toBe('target@test.com');
    });

    it('should throw NotFoundException if requested user not found', async () => {
      usersService.findOneById?.mockResolvedValue(null);
      await expect(controller.findOne('999', mockAdminUser)).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create user', async () => {
      usersService.create?.mockResolvedValue({ id: '1' });
      await controller.create({
        email: 'test@test.com',
        password: 'pass',
        role: 'user',
      });
      expect(usersService.create).toHaveBeenCalledWith(
        'test@test.com',
        'pass',
        'user',
      );
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      usersService.update?.mockResolvedValue({ id: '1' });
      await controller.updateUser('1', { role: 'admin' });
      expect(usersService.update).toHaveBeenCalledWith('1', { role: 'admin' });
    });
  });

  describe('delete flows', () => {
    it('should request self delete', async () => {
      await controller.requestSelfDelete('test@test.com');
      expect(otpService.generateAndSendOtp).toHaveBeenCalledWith(
        'test@test.com',
      );
    });

    it('should verify self delete, remove user and clear cookies', async () => {
      await controller.verifySelfDelete(
        '1',
        'test@test.com',
        { code: '123' },
        mockReply,
      );

      expect(otpService.verifyOtp).toHaveBeenCalledWith('test@test.com', '123');
      expect(usersService.remove).toHaveBeenCalledWith('1');
      expect(clearCookieMock).toHaveBeenCalledTimes(2);
    });

    it('should remove user by ID (Admin)', async () => {
      await controller.remove('2');
      expect(usersService.remove).toHaveBeenCalledWith('2');
    });

    it('should attempt OTP verification for self delete', async () => {
      otpService.verifyOtp?.mockResolvedValue(false);
      const result = await controller.verifySelfDelete(
        '1',
        'test@test.com',
        { code: 'wrong' },
        mockReply,
      );
      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        'test@test.com',
        'wrong',
      );
      expect(result).toBeDefined();
    });
  });
});
