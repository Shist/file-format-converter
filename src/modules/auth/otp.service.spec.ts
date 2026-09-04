import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OtpService } from './otp.service';
import { OtpEntity } from './entities/otp.entity';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('test-salt'),
  hash: jest.fn().mockResolvedValue('hashed-code'),
  compare: jest.fn(),
}));

describe('OtpService', () => {
  let service: OtpService;
  let otpRepository: MockRepository<OtpEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: getRepositoryToken(OtpEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    otpRepository = module.get<MockRepository<OtpEntity>>(
      getRepositoryToken(OtpEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAndSendOtp', () => {
    it('should generate, hash, save and send OTP', async () => {
      const email = 'test@test.com';
      const mockOtp = { email, codeHash: 'hashed-code' } as OtpEntity;
      otpRepository.create?.mockReturnValue(mockOtp);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.generateAndSendOtp(email);

      expect(otpRepository.delete).toHaveBeenCalledWith({ email });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 'test-salt');
      expect(otpRepository.create).toHaveBeenCalled();
      expect(otpRepository.save).toHaveBeenCalledWith(mockOtp);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('verifyOtp', () => {
    it('should return true if OTP is valid', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 15);
      const mockOtp = {
        email: 'test@test.com',
        codeHash: 'hashed-code',
        expiresAt: futureDate,
      } as OtpEntity;

      otpRepository.findOne?.mockResolvedValue(mockOtp);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyOtp('test@test.com', '123456');

      expect(result).toBe(true);
      expect(otpRepository.delete).toHaveBeenCalledWith({
        email: 'test@test.com',
      });
    });

    it('should throw BadRequestException if OTP not found', async () => {
      otpRepository.findOne?.mockResolvedValue(null);

      await expect(
        service.verifyOtp('test@test.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 15);
      const mockOtp = {
        email: 'test@test.com',
        codeHash: 'hashed-code',
        expiresAt: pastDate,
      } as OtpEntity;

      otpRepository.findOne?.mockResolvedValue(mockOtp);

      await expect(
        service.verifyOtp('test@test.com', '123456'),
      ).rejects.toThrow(BadRequestException);
      expect(otpRepository.delete).toHaveBeenCalledWith({
        email: 'test@test.com',
      });
    });

    it('should throw BadRequestException if OTP is invalid', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 15);
      const mockOtp = {
        email: 'test@test.com',
        codeHash: 'hashed-code',
        expiresAt: futureDate,
      } as OtpEntity;

      otpRepository.findOne?.mockResolvedValue(mockOtp);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyOtp('test@test.com', 'wrong-code'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
