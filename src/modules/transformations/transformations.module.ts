import { Module } from '@nestjs/common';
import { TransformationsController } from './transformations.controller';
import { TransformationsService } from './transformations.service';
import { TextTransformationStrategy } from './strategies/text-transformation.strategy';
import { ImageTransformationStrategy } from './strategies/image-transformation.strategy';

@Module({
  controllers: [TransformationsController],
  providers: [
    TransformationsService,
    TextTransformationStrategy,
    ImageTransformationStrategy,
  ],
})
export class TransformationsModule {}
