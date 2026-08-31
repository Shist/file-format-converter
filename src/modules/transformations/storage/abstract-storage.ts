import { Readable } from 'stream';

export abstract class AbstractStorage {
  abstract save(fileStream: Readable, filename: string): Promise<string>;

  abstract get(fileId: string): Promise<Readable>;

  abstract delete(fileId: string): Promise<void>;
}
