import { Injectable, BadRequestException } from '@nestjs/common';
import { Readable, PassThrough } from 'stream';
import csvParser from 'csv-parser';
import * as fastCsv from 'fast-csv';
import * as xml2js from 'xml2js';
import * as yaml from 'js-yaml';
import {
  ITransformationStrategy,
  TransformationResult,
} from '../interfaces/transformation-strategy.interface';

export interface TextTransformationOptions {
  sourceFormat?: string;
}

export type ParsedData = Record<string, unknown>;

@Injectable()
export class TextTransformationStrategy implements ITransformationStrategy {
  private readonly supportedFormats = ['csv', 'json', 'xml', 'yaml'];

  supports(sourceFormat: string, targetFormat: string): boolean {
    return (
      this.supportedFormats.includes(sourceFormat) &&
      this.supportedFormats.includes(targetFormat) &&
      sourceFormat !== targetFormat
    );
  }

  async transform(
    fileStream: Readable,
    targetFormat: string,
    options?: unknown,
  ): Promise<TransformationResult> {
    const fileBuffer = await this.streamToBuffer(fileStream);
    const fileContent = fileBuffer.toString('utf-8');

    let internalData: ParsedData[] = [];

    const opts = options as TextTransformationOptions | undefined;
    const sourceFormat = opts?.sourceFormat;

    try {
      if (sourceFormat === 'json') {
        const parsed = JSON.parse(fileContent) as unknown;
        internalData = Array.isArray(parsed)
          ? (parsed as ParsedData[])
          : [parsed as ParsedData];
      } else if (sourceFormat === 'yaml') {
        const parsed = yaml.load(fileContent);
        internalData = Array.isArray(parsed)
          ? (parsed as ParsedData[])
          : [parsed as ParsedData];
      } else if (sourceFormat === 'xml') {
        const parser = new xml2js.Parser({ explicitArray: false });
        const parsed = (await parser.parseStringPromise(
          fileContent,
        )) as ParsedData;
        const rootKey = Object.keys(parsed)[0];

        if (rootKey && parsed[rootKey]) {
          const data = parsed[rootKey] as ParsedData;
          const nestedKey = Object.keys(data)[0];

          if (nestedKey && data[nestedKey]) {
            internalData = Array.isArray(data[nestedKey])
              ? (data[nestedKey] as ParsedData[])
              : [data];
          } else {
            internalData = [data];
          }
        }
      } else if (sourceFormat === 'csv') {
        internalData = await this.parseCsv(fileBuffer);
      }
    } catch {
      throw new BadRequestException(
        `Failed to parse ${sourceFormat ?? 'unknown'} file`,
      );
    }

    const outStream = new PassThrough();
    let contentType = 'text/plain';

    try {
      if (targetFormat === 'json') {
        contentType = 'application/json';
        outStream.end(JSON.stringify(internalData, null, 2));
      } else if (targetFormat === 'yaml') {
        contentType = 'text/yaml';
        outStream.end(yaml.dump(internalData));
      } else if (targetFormat === 'xml') {
        contentType = 'application/xml';
        const builder = new xml2js.Builder({ rootName: 'root' });
        outStream.end(builder.buildObject({ item: internalData }));
      } else if (targetFormat === 'csv') {
        contentType = 'text/csv';
        fastCsv.write(internalData, { headers: true }).pipe(outStream);
      }
    } catch {
      throw new BadRequestException(`Failed to serialize to ${targetFormat}`);
    }

    return {
      stream: outStream,
      contentType,
      extension: targetFormat,
    };
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk as Uint8Array | string));
    }
    return Buffer.concat(chunks);
  }

  private parseCsv(buffer: Buffer): Promise<ParsedData[]> {
    return new Promise((resolve, reject) => {
      const results: ParsedData[] = [];
      const stream = Readable.from(buffer);
      stream
        .pipe(csvParser())
        .on('data', (data: ParsedData) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (err: Error) => reject(err));
    });
  }
}
