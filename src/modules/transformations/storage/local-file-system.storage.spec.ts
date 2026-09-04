import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { Readable, PassThrough } from 'stream';
import { LocalFileSystemStorage } from './local-file-system.storage';

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 1024 }),
  },
}));

describe('LocalFileSystemStorage', () => {
  let storage: LocalFileSystemStorage;

  beforeEach(async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalFileSystemStorage,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('./uploads'),
          },
        },
      ],
    }).compile();

    storage = module.get<LocalFileSystemStorage>(LocalFileSystemStorage);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(storage).toBeDefined();
  });

  describe('save', () => {
    it('should save file stream to local disk and return meta', async () => {
      const mockStream = Readable.from([Buffer.from('test')]);
      const mockWriteStream = new PassThrough();

      (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (fs.promises.stat as jest.Mock).mockResolvedValue({ size: 1024 });

      const result = await storage.save(mockStream, 'txt', 'text/plain');

      expect(result).toHaveProperty('fileId');
      expect(result.size).toBe(1024);
    });
  });

  describe('get', () => {
    it('should return read stream if file exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const mockReadStream = new Readable();
      (fs.createReadStream as jest.Mock).mockReturnValue(mockReadStream);

      const stream = await storage.get('test.txt');

      expect(stream).toBe(mockReadStream);
    });

    it('should throw NotFoundException if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => storage.get('notfound.txt')).toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should unlink file if exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await storage.delete('test.txt');

      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    it('should do nothing on delete if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await storage.delete('test.txt');

      expect(fs.promises.unlink).not.toHaveBeenCalled();
    });
  });
});
