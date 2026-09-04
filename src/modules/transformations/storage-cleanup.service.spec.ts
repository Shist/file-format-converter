import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, LessThan, Not, IsNull } from 'typeorm';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => {},
  CronExpression: {
    EVERY_DAY_AT_MIDNIGHT: '0 0 * * *',
  },
}));

import { StorageCleanupService } from './storage-cleanup.service';
import { TransformationHistoryEntity } from './entities/transformation-history.entity';
import { AbstractStorage } from './storage/abstract-storage';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('StorageCleanupService', () => {
  let service: StorageCleanupService;
  let historyRepository: MockRepository<TransformationHistoryEntity>;
  let storage: Partial<Record<keyof AbstractStorage, jest.Mock>>;

  beforeEach(async () => {
    historyRepository = {
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    storage = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageCleanupService,
        {
          provide: getRepositoryToken(TransformationHistoryEntity),
          useValue: historyRepository,
        },
        {
          provide: AbstractStorage,
          useValue: storage,
        },
      ],
    }).compile();

    service = module.get<StorageCleanupService>(StorageCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCron', () => {
    it('should find expired files, delete from storage, and update records', async () => {
      const mockRecords = [
        { id: '1', fileId: 'file-1.png' } as TransformationHistoryEntity,
        { id: '2', fileId: 'file-2.png' } as TransformationHistoryEntity,
      ];

      historyRepository.find?.mockResolvedValue(mockRecords);
      storage.delete?.mockResolvedValue(undefined);
      historyRepository.save?.mockResolvedValue({});

      await service.handleCron();

      expect(historyRepository.find).toHaveBeenCalledWith({
        where: {
          createdAt: LessThan(expect.any(Date)),
          fileId: Not(IsNull()),
        },
      });
      expect(storage.delete).toHaveBeenCalledTimes(2);
      expect(storage.delete).toHaveBeenCalledWith('file-1.png');
      expect(storage.delete).toHaveBeenCalledWith('file-2.png');
      expect(historyRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should do nothing if no expired records found', async () => {
      historyRepository.find?.mockResolvedValue([]);

      await service.handleCron();

      expect(storage.delete).not.toHaveBeenCalled();
      expect(historyRepository.save).not.toHaveBeenCalled();
    });
  });
});
