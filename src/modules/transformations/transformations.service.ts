import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { Readable } from 'stream';
import {
  ITransformationStrategy,
  TransformationResult,
} from './interfaces/transformation-strategy.interface';
import { TextTransformationStrategy } from './strategies/text-transformation.strategy';
import { ImageTransformationStrategy } from './strategies/image-transformation.strategy';

@Injectable()
export class TransformationsService {
  private readonly strategies: ITransformationStrategy[];

  constructor(
    private readonly textStrategy: TextTransformationStrategy,
    private readonly imageStrategy: ImageTransformationStrategy,
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
}
