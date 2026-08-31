import { Injectable, BadRequestException } from '@nestjs/common';
import { Readable, PassThrough } from 'stream';
import sharp from 'sharp';
import {
  ITransformationStrategy,
  TransformationResult,
} from '../interfaces/transformation-strategy.interface';

export interface ImageTransformationOptions {
  sourceFormat?: string;
  quality?: number;
  width?: number;
  height?: number;
  background?: string;
}

@Injectable()
export class ImageTransformationStrategy implements ITransformationStrategy {
  private readonly MAX_DIMENSION = 4096;

  supports(sourceFormat: string, targetFormat: string): boolean {
    const allowedSource = ['png', 'jpeg', 'jpg', 'svg'];
    const allowedTarget = ['png', 'jpeg', 'jpg'];
    return (
      allowedSource.includes(sourceFormat) &&
      allowedTarget.includes(targetFormat) &&
      sourceFormat !== targetFormat
    );
  }

  transform(
    fileStream: Readable,
    targetFormat: string,
    options?: unknown,
  ): Promise<TransformationResult> {
    const opts = options as ImageTransformationOptions | undefined;
    const targetExt = targetFormat === 'jpg' ? 'jpeg' : targetFormat;

    let sharpInstance = sharp();
    const bg = opts?.background ?? '#ffffff';

    if (opts?.width || opts?.height) {
      const w = opts.width
        ? Math.min(opts.width, this.MAX_DIMENSION)
        : undefined;
      const h = opts.height
        ? Math.min(opts.height, this.MAX_DIMENSION)
        : undefined;
      sharpInstance = sharpInstance.resize(w, h, {
        fit: 'inside',
        background: bg,
      });
    }

    if (targetExt === 'jpeg') {
      sharpInstance = sharpInstance.flatten({ background: bg }).jpeg({
        quality: opts?.quality ? Math.max(1, Math.min(100, opts.quality)) : 80,
      });
    } else if (targetExt === 'png') {
      sharpInstance = sharpInstance.png();
    }

    const outStream = new PassThrough();

    sharpInstance.on('error', (err: Error) => {
      outStream.destroy(
        new BadRequestException(`Image processing failed: ${err.message}`),
      );
    });

    fileStream.pipe(sharpInstance).pipe(outStream);

    return Promise.resolve({
      stream: outStream,
      contentType: `image/${targetExt}`,
      extension: targetExt,
    });
  }
}
