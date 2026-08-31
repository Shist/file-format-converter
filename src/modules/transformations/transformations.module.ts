import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule'; // <-- Импорт
import { TransformationsController } from './transformations.controller';
import { TransformationsService } from './transformations.service';
import { TextTransformationStrategy } from './strategies/text-transformation.strategy';
import { ImageTransformationStrategy } from './strategies/image-transformation.strategy';
import { TransformationHistoryEntity } from './entities/transformation-history.entity';
import { RbacModule } from '../rbac/rbac.module';
import { AbstractStorage } from './storage/abstract-storage';
import { LocalFileSystemStorage } from './storage/local-file-system.storage';
import { StorageCleanupService } from './storage-cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransformationHistoryEntity]),
    RbacModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [TransformationsController],
  providers: [
    TransformationsService,
    TextTransformationStrategy,
    ImageTransformationStrategy,
    StorageCleanupService,
    {
      provide: AbstractStorage,
      useClass: LocalFileSystemStorage,
    },
  ],
})
export class TransformationsModule {}
