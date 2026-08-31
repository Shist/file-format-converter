import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransformationsController } from './transformations.controller';
import { TransformationsService } from './transformations.service';
import { TextTransformationStrategy } from './strategies/text-transformation.strategy';
import { ImageTransformationStrategy } from './strategies/image-transformation.strategy';
import { TransformationHistoryEntity } from './entities/transformation-history.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransformationHistoryEntity]),
    RbacModule,
  ],
  controllers: [TransformationsController],
  providers: [
    TransformationsService,
    TextTransformationStrategy,
    ImageTransformationStrategy,
  ],
})
export class TransformationsModule {}
