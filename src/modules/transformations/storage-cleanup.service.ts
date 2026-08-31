import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull } from 'typeorm';
import { TransformationHistoryEntity } from './entities/transformation-history.entity';
import { AbstractStorage } from './storage/abstract-storage';

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);

  constructor(
    @InjectRepository(TransformationHistoryEntity)
    private readonly historyRepo: Repository<TransformationHistoryEntity>,
    private readonly storage: AbstractStorage,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Running storage cleanup task...');

    const ttlHours = 24;
    const expirationDate = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

    const oldRecords = await this.historyRepo.find({
      where: {
        createdAt: LessThan(expirationDate),
        fileId: Not(IsNull()),
      },
    });

    if (oldRecords.length === 0) {
      return;
    }

    let deletedCount = 0;
    for (const record of oldRecords) {
      if (record.fileId) {
        await this.storage.delete(record.fileId);
        record.fileId = null;
        await this.historyRepo.save(record);
        deletedCount++;
      }
    }

    this.logger.log(`Cleaned up ${deletedCount} expired files.`);
  }
}
