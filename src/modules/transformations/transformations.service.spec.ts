import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnsupportedMediaTypeException } from '@nestjs/common';
import { Readable } from 'stream';
import { Repository, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import { TransformationsService } from './transformations.service';
import { TextTransformationStrategy } from './strategies/text-transformation.strategy';
import { ImageTransformationStrategy } from './strategies/image-transformation.strategy';
import { TransformationHistoryEntity } from './entities/transformation-history.entity';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  createQueryBuilder?: jest.Mock;
};

describe('TransformationsService', () => {
  let service: TransformationsService;
  let historyRepository: MockRepository<TransformationHistoryEntity>;
  let textStrategy: Partial<
    Record<keyof TextTransformationStrategy, jest.Mock>
  >;
  let imageStrategy: Partial<
    Record<keyof ImageTransformationStrategy, jest.Mock>
  >;

  beforeEach(async () => {
    textStrategy = {
      supports: jest.fn(),
      transform: jest.fn(),
    };

    imageStrategy = {
      supports: jest.fn(),
      transform: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransformationsService,
        { provide: TextTransformationStrategy, useValue: textStrategy },
        { provide: ImageTransformationStrategy, useValue: imageStrategy },
        {
          provide: getRepositoryToken(TransformationHistoryEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransformationsService>(TransformationsService);
    historyRepository = module.get<MockRepository<TransformationHistoryEntity>>(
      getRepositoryToken(TransformationHistoryEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFormats', () => {
    it('should return available formats', () => {
      const formats = service.getFormats();
      expect(formats.length).toBeGreaterThan(0);
      expect(formats[0]).toHaveProperty('source');
      expect(formats[0]).toHaveProperty('target');
    });
  });

  describe('convert', () => {
    it('should call the correct strategy if supported', async () => {
      textStrategy.supports?.mockReturnValue(true);
      const mockResult = {
        stream: new Readable(),
        contentType: 'text/csv',
        extension: 'csv',
      };
      textStrategy.transform?.mockResolvedValue(mockResult);

      const stream = new Readable();
      const result = await service.convert(stream, 'json', 'csv');

      expect(textStrategy.supports).toHaveBeenCalledWith('json', 'csv');
      expect(textStrategy.transform).toHaveBeenCalledWith(
        stream,
        'csv',
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw UnsupportedMediaTypeException if no strategy supports the conversion', async () => {
      textStrategy.supports?.mockReturnValue(false);
      imageStrategy.supports?.mockReturnValue(false);

      await expect(
        service.convert(new Readable(), 'unknown', 'csv'),
      ).rejects.toThrow(UnsupportedMediaTypeException);
    });
  });

  describe('logHistory', () => {
    it('should create and save history record', async () => {
      const mockData = {
        userId: '1',
        type: 'file',
      } as Partial<TransformationHistoryEntity>;
      const mockSaved = { id: 'uuid', ...mockData };

      historyRepository.create?.mockReturnValue(
        mockSaved as TransformationHistoryEntity,
      );
      historyRepository.save?.mockResolvedValue(
        mockSaved as TransformationHistoryEntity,
      );

      const result = await service.logHistory(mockData);

      expect(historyRepository.create).toHaveBeenCalledWith(mockData);
      expect(historyRepository.save).toHaveBeenCalledWith(mockSaved);
      expect(result).toEqual(mockSaved);
    });
  });

  describe('getHistory', () => {
    let qbMock: Partial<
      Record<keyof SelectQueryBuilder<TransformationHistoryEntity>, jest.Mock>
    >;

    beforeEach(() => {
      qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      historyRepository.createQueryBuilder?.mockReturnValue(qbMock);
    });

    it('should build query and return paginated history', async () => {
      const mockItems = [
        { id: '1', createdAt: new Date() } as TransformationHistoryEntity,
      ];
      qbMock.getMany?.mockResolvedValue([...mockItems]);

      const result = await service.getHistory('1', {
        limit: 10,
        type: 'file',
        status: 'success',
      });

      expect(historyRepository.createQueryBuilder).toHaveBeenCalledWith(
        'history',
      );
      expect(qbMock.where).toHaveBeenCalledWith('history.user_id = :userId', {
        userId: '1',
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith('history.type = :type', {
        type: 'file',
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith('history.status = :status', {
        status: 'success',
      });
      expect(qbMock.take).toHaveBeenCalledWith(11);
      expect(result.items).toEqual(mockItems);
      expect(result.nextCursor).toBeNull();
    });

    it('should generate nextCursor if there are more items', async () => {
      const date = new Date();
      const mockItems = [
        { id: '2', createdAt: date } as TransformationHistoryEntity,
        { id: '1', createdAt: date } as TransformationHistoryEntity,
      ];
      qbMock.getMany?.mockResolvedValue([...mockItems]);

      const result = await service.getHistory('1', { limit: 1 });

      expect(result.items.length).toBe(1);
      const expectedCursor = Buffer.from(`${date.getTime()}_2`).toString(
        'base64',
      );
      expect(result.nextCursor).toBe(expectedCursor);
    });

    it('should decode cursor and apply condition', async () => {
      const date = new Date();
      const cursor = Buffer.from(`${date.getTime()}_123`).toString('base64');
      qbMock.getMany?.mockResolvedValue([]);

      await service.getHistory('1', { limit: 10, cursor });

      expect(qbMock.andWhere).toHaveBeenCalledWith(
        `(history.createdAt < :date OR (history.createdAt = :date AND history.id < :id))`,
        { date, id: '123' },
      );
    });
  });
});
