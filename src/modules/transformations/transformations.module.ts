import { Module } from '@nestjs/common';
import { TransformationsController } from './transformations.controller';
import { TransformationsService } from './transformations.service';
import { TextTransformationStrategy } from './strategies/text-transformation.strategy';

@Module({
  controllers: [TransformationsController],
  providers: [TransformationsService, TextTransformationStrategy],
})
export class TransformationsModule {}
