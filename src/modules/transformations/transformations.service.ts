import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import {
  ITransformationStrategy,
  TransformationResult,
} from './interfaces/transformation-strategy.interface';
import { TextTransformationStrategy } from './strategies/text-transformation.strategy';
import { ImageTransformationStrategy } from './strategies/image-transformation.strategy';
import { TransformationHistoryEntity } from './entities/transformation-history.entity';
import { GetHistoryQueryDto } from './dto/get-history-query.dto';

@Injectable()
export class TransformationsService {
  private readonly strategies: ITransformationStrategy[];

  constructor(
    private readonly textStrategy: TextTransformationStrategy,
    private readonly imageStrategy: ImageTransformationStrategy,
    @InjectRepository(TransformationHistoryEntity)
    private readonly historyRepository: Repository<TransformationHistoryEntity>,
  ) {
    this.strategies = [this.textStrategy, this.imageStrategy];
  }

  getFormats() {
    return [
      { source: 'csv', target: ['json', 'xml', 'yaml'] },
      { source: 'json', target: ['csv', 'xml', 'yaml'] },
      { source: 'xml', target: ['csv', 'json', 'yaml'] },
      { source: 'yaml', target: ['csv', 'json', 'xml'] },
      { source: 'png', target: ['jpeg'] },
      { source: 'jpeg', target: ['png'] },
      { source: 'svg', target: ['png', 'jpeg'] },
    ];
  }

  async convert(
    fileStream: Readable,
    sourceFormat: string,
    targetFormat: string,
    options?: unknown,
  ): Promise<TransformationResult> {
    const strategy = this.strategies.find((s) =>
      s.supports(sourceFormat, targetFormat),
    );

    if (!strategy) {
      throw new UnsupportedMediaTypeException(
        `Conversion from ${sourceFormat} to ${targetFormat} is not supported.`,
      );
    }

    return strategy.transform(fileStream, targetFormat, options);
  }

  async logHistory(
    data: Partial<TransformationHistoryEntity>,
  ): Promise<TransformationHistoryEntity> {
    const history = this.historyRepository.create(data);
    return this.historyRepository.save(history);
  }

  async getHistory(userId: string, query: GetHistoryQueryDto) {
    const { cursor, limit, type, sourceFormat, targetFormat, status } = query;

    const qb = this.historyRepository
      .createQueryBuilder('history')
      .where('history.user_id = :userId', { userId });

    if (type) qb.andWhere('history.type = :type', { type });
    if (sourceFormat)
      qb.andWhere('history.sourceFormat = :sourceFormat', { sourceFormat });
    if (targetFormat)
      qb.andWhere('history.targetFormat = :targetFormat', { targetFormat });
    if (status) qb.andWhere('history.status = :status', { status });

    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('ascii');
      const [cursorTime, cursorId] = decodedCursor.split('_');
      const date = new Date(Number(cursorTime));

      qb.andWhere(
        `(history.createdAt < :date OR (history.createdAt = :date AND history.id < :id))`,
        { date, id: cursorId },
      );
    }

    qb.orderBy('history.createdAt', 'DESC')
      .addOrderBy('history.id', 'DESC')
      .take(limit + 1);

    const items = await qb.getMany();
    const hasNextPage = items.length > limit;

    if (hasNextPage) {
      items.pop();
    }

    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = Buffer.from(
        `${lastItem.createdAt.getTime()}_${lastItem.id}`,
      ).toString('base64');
    }

    return { items, nextCursor };
  }
}
