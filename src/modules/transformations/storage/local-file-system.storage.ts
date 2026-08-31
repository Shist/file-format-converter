import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AbstractStorage, FileMetadata } from './abstract-storage';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pipeline } from 'stream/promises';

@Injectable()
export class LocalFileSystemStorage implements AbstractStorage {
  private readonly logger = new Logger(LocalFileSystemStorage.name);
  private readonly storagePath = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async save(
    stream: Readable,
    extension: string,
    contentType: string,
  ): Promise<FileMetadata> {
    const fileId = `${uuidv4()}.${extension}`;
    const filePath = this.getFilePath(fileId);

    try {
      const writeStream = fs.createWriteStream(filePath);
      await pipeline(stream, writeStream);

      const stats = await fs.promises.stat(filePath);

      return {
        fileId,
        extension,
        contentType,
        size: stats.size,
      };
    } catch (error) {
      this.logger.error(`Failed to save file ${fileId}`, error);
      throw new InternalServerErrorException(
        'Failed to save file to local storage',
      );
    }
  }

  get(fileId: string): Promise<Readable> {
    const filePath = this.getFilePath(fileId);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found in storage');
    }

    return Promise.resolve(fs.createReadStream(filePath));
  }

  async delete(fileId: string): Promise<void> {
    const filePath = this.getFilePath(fileId);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}`, error);
    }
  }

  async listAll(): Promise<string[]> {
    try {
      return await fs.promises.readdir(this.storagePath);
    } catch (error) {
      this.logger.error('Failed to read storage directory', error);
      return [];
    }
  }

  private getFilePath(fileId: string): string {
    const safeFileId = path.basename(fileId);
    return path.join(this.storagePath, safeFileId);
  }
}
