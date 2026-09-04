import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import { TextTransformationStrategy } from './text-transformation.strategy';

describe('TextTransformationStrategy', () => {
  let strategy: TextTransformationStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextTransformationStrategy],
    }).compile();

    strategy = module.get<TextTransformationStrategy>(
      TextTransformationStrategy,
    );
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('supports', () => {
    it('should support valid text format conversions', () => {
      expect(strategy.supports('json', 'xml')).toBe(true);
      expect(strategy.supports('csv', 'yaml')).toBe(true);
    });

    it('should not support same format conversion', () => {
      expect(strategy.supports('json', 'json')).toBe(false);
    });

    it('should not support invalid formats', () => {
      expect(strategy.supports('png', 'json')).toBe(false);
    });
  });

  describe('transform', () => {
    const createStream = (content: string) =>
      Readable.from([Buffer.from(content)]);

    const streamToString = async (stream: Readable): Promise<string> => {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk as Uint8Array | string));
      }
      return Buffer.concat(chunks).toString('utf-8');
    };

    it('should convert JSON to YAML', async () => {
      const stream = createStream(JSON.stringify({ key: 'value' }));
      const result = await strategy.transform(stream, 'yaml', {
        sourceFormat: 'json',
      });

      expect(result.contentType).toBe('text/yaml');
      expect(result.extension).toBe('yaml');
      const output = await streamToString(result.stream);
      expect(output).toContain('key: value');
    });

    it('should convert YAML to XML', async () => {
      const stream = createStream('key: value\n');
      const result = await strategy.transform(stream, 'xml', {
        sourceFormat: 'yaml',
      });

      expect(result.contentType).toBe('application/xml');
      const output = await streamToString(result.stream);
      expect(output).toContain('<key>value</key>');
    });

    it('should convert XML to JSON', async () => {
      const stream = createStream('<root><test>value</test></root>');
      const result = await strategy.transform(stream, 'json', {
        sourceFormat: 'xml',
      });

      expect(result.contentType).toBe('application/json');
      const output = await streamToString(result.stream);
      expect(JSON.parse(output)).toEqual([{ test: 'value' }]);
    });

    it('should convert CSV to JSON', async () => {
      const stream = createStream('name,age\nJohn,30\n');
      const result = await strategy.transform(stream, 'json', {
        sourceFormat: 'csv',
      });

      expect(result.contentType).toBe('application/json');
      const output = await streamToString(result.stream);
      expect(JSON.parse(output)).toEqual([{ name: 'John', age: '30' }]);
    });

    it('should convert JSON to CSV', async () => {
      const stream = createStream(
        JSON.stringify([{ name: 'John', age: '30' }]),
      );
      const result = await strategy.transform(stream, 'csv', {
        sourceFormat: 'json',
      });

      expect(result.contentType).toBe('text/csv');
      const output = await streamToString(result.stream);
      expect(output).toContain('name,age');
      expect(output).toContain('John,30');
    });

    it('should throw BadRequestException on invalid parsing format', async () => {
      const stream = createStream('{ bad json');
      await expect(
        strategy.transform(stream, 'yaml', { sourceFormat: 'json' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
