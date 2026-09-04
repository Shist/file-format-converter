import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { Readable } from 'stream';
import { TransformationsController } from './transformations.controller';
import { TransformationsService } from './transformations.service';
import { AbstractStorage } from './storage/abstract-storage';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

describe('TransformationsController', () => {
  let controller: TransformationsController;
  let service: Partial<Record<keyof TransformationsService, jest.Mock>>;
  let storage: Partial<Record<keyof AbstractStorage, jest.Mock>>;

  const headerMock = jest.fn().mockReturnThis();
  const sendMock = jest.fn().mockReturnThis();

  const mockReply = {
    header: headerMock,
    send: sendMock,
  } as unknown as FastifyReply;

  beforeEach(async () => {
    service = {
      getFormats: jest.fn(),
      convert: jest.fn(),
      logHistory: jest.fn().mockResolvedValue(null),
      getHistory: jest.fn(),
    };

    storage = {
      get: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransformationsController],
      providers: [
        { provide: TransformationsService, useValue: service },
        { provide: AbstractStorage, useValue: storage },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TransformationsController>(
      TransformationsController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFormats', () => {
    it('should return formats', () => {
      service.getFormats?.mockReturnValue([]);
      controller.getFormats();
      expect(service.getFormats).toHaveBeenCalled();
    });
  });

  describe('downloadSavedFile', () => {
    it('should set headers and return stream', async () => {
      const mockStream = new Readable();
      storage.get?.mockResolvedValue(mockStream);

      await controller.downloadSavedFile('file.csv', mockReply);

      expect(storage.get).toHaveBeenCalledWith('file.csv');
      expect(headerMock).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="download.csv"',
      );
      expect(sendMock).toHaveBeenCalledWith(mockStream);
    });
  });

  describe('convertFile', () => {
    it('should throw BadRequestException if not multipart', async () => {
      const req = { isMultipart: () => false } as FastifyRequest;
      await expect(
        controller.convertFile(req, mockReply, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process conversion successfully and return stream without saving', async () => {
      const mockFileStream = new Readable();
      const mockReq = {
        isMultipart: () => true,
        file: jest.fn().mockResolvedValue({
          filename: 'test.csv',
          file: mockFileStream,
          fields: {
            targetFormat: { value: 'json' },
          },
        }),
      } as unknown as FastifyRequest;

      const mockResultStream = new Readable();
      service.convert?.mockResolvedValue({
        stream: mockResultStream,
        contentType: 'application/json',
        extension: 'json',
      });

      await controller.convertFile(mockReq, mockReply, 'user-1', 'false');

      expect(service.convert).toHaveBeenCalledWith(
        mockFileStream,
        'csv',
        'json',
        { sourceFormat: 'csv' },
      );
      expect(service.logHistory).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', type: 'file' }),
      );
      expect(sendMock).toHaveBeenCalledWith(mockResultStream);
    });

    it('should save file to storage if saveQuery is true', async () => {
      const mockFileStream = new Readable();
      const mockReq = {
        isMultipart: () => true,
        file: jest.fn().mockResolvedValue({
          filename: 'image.png',
          file: mockFileStream,
          fields: { targetFormat: { value: 'jpeg' }, quality: { value: '90' } },
        }),
      } as unknown as FastifyRequest;

      const mockResultStream = new Readable();
      service.convert?.mockResolvedValue({
        stream: mockResultStream,
        contentType: 'image/jpeg',
        extension: 'jpeg',
      });

      storage.save?.mockResolvedValue({ fileId: 'saved.jpeg', size: 1024 });

      await controller.convertFile(mockReq, mockReply, 'user-1', 'true');

      expect(storage.save).toHaveBeenCalled();
      expect(service.logHistory).toHaveBeenCalledWith(
        expect.objectContaining({ fileId: 'saved.jpeg', fileSize: 1024 }),
      );
      expect(sendMock).toHaveBeenCalledWith({
        message: 'File converted and saved successfully',
        fileId: 'saved.jpeg',
        downloadUrl: '/api/convert/saved.jpeg',
      });
    });
  });

  describe('History Endpoints', () => {
    it('should return self history', async () => {
      await controller.getSelfHistory('user-1', { limit: 20 });
      expect(service.getHistory).toHaveBeenCalledWith('user-1', { limit: 20 });
    });

    it('should return admin history', async () => {
      await controller.getAdminHistory('target-1', { limit: 20 });
      expect(service.getHistory).toHaveBeenCalledWith('target-1', {
        limit: 20,
      });
    });
  });
});
