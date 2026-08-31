import { Readable } from 'stream';

export interface TransformationResult {
  stream: Readable;
  contentType: string;
  extension: string;
}

export interface ITransformationStrategy {
  supports(sourceFormat: string, targetFormat: string): boolean;

  transform(
    fileStream: Readable,
    targetFormat: string,
    options?: unknown,
  ): Promise<TransformationResult>;
}
