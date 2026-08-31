import { Readable } from 'stream';

export interface FileMetadata {
  fileId: string;
  extension: string;
  contentType: string;
  size?: number;
}

export abstract class AbstractStorage {
  abstract save(
    stream: Readable,
    extension: string,
    contentType: string,
  ): Promise<FileMetadata>;

  abstract get(fileId: string): Promise<Readable>;

  abstract delete(fileId: string): Promise<void>;

  abstract listAll(): Promise<string[]>;
}
