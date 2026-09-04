import { Test, TestingModule } from '@nestjs/testing';
import { PassThrough } from 'stream';
import sharp from 'sharp';
import { ImageTransformationStrategy } from './image-transformation.strategy';

type MockSharpInstance = PassThrough & {
  resize: jest.Mock;
  flatten: jest.Mock;
  jpeg: jest.Mock;
  png: jest.Mock;
  errorHandler?: (err: Error) => void;
};

jest.mock('sharp');

describe('ImageTransformationStrategy', () => {
  let strategy: ImageTransformationStrategy;

  beforeEach(async () => {
    (sharp as unknown as jest.Mock).mockImplementation(() => {
      const sharpInstance = new PassThrough() as MockSharpInstance;

      sharpInstance.resize = jest.fn().mockReturnThis();
      sharpInstance.flatten = jest.fn().mockReturnThis();
      sharpInstance.jpeg = jest.fn().mockReturnThis();
      sharpInstance.png = jest.fn().mockReturnThis();

      sharpInstance.on = jest.fn(
        (event: string | symbol, callback: (...args: unknown[]) => void) => {
          if (event === 'error') {
            sharpInstance.errorHandler = callback as (err: Error) => void;
          }
          return sharpInstance;
        },
      );

      return sharpInstance;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageTransformationStrategy],
    }).compile();

    strategy = module.get<ImageTransformationStrategy>(
      ImageTransformationStrategy,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('supports', () => {
    it('should return true for supported formats', () => {
      expect(strategy.supports('png', 'jpeg')).toBe(true);
      expect(strategy.supports('svg', 'png')).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      expect(strategy.supports('jpeg', 'svg')).toBe(false);
      expect(strategy.supports('png', 'png')).toBe(false);
    });
  });

  describe('transform', () => {
    it('should transform to jpeg with resizing', async () => {
      const stream = new PassThrough();
      const options = { width: 100, height: 100, quality: 90 };
      const result = await strategy.transform(stream, 'jpeg', options);

      expect(result.contentType).toBe('image/jpeg');
      expect(result.extension).toBe('jpeg');
    });

    it('should transform to png without explicit options', async () => {
      const stream = new PassThrough();
      const result = await strategy.transform(stream, 'png');

      expect(result.contentType).toBe('image/png');
      expect(result.extension).toBe('png');
    });
  });
});
