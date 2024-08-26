import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ImageDocument, Image } from './image.entity';
import { Readable } from 'stream';
import { GridFSBucket, ObjectId } from 'mongodb';
import * as mongoose from 'mongoose';

@Injectable()
export class FileSystemService {
  private bucket: GridFSBucket;

  constructor(
    @InjectModel(Image.name, 'DatabaseConnection')
    private readonly imageModel: Model<ImageDocument>,
    @InjectConnection('DatabaseConnection')
    private readonly connection: Connection,
  ) {
    this.bucket = new GridFSBucket(this.connection.db, {
      bucketName: 'images',
    });
  }

  async storeImage(file: Express.Multer.File): Promise<string> {
    const { originalname, buffer, mimetype } = file;
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    const uploadStream = this.bucket.openUploadStream(originalname, {
      contentType: mimetype,
    });

    return new Promise((resolve, reject) => {
      readableStream
        .pipe(uploadStream)
        .on('error', (error) => reject(error))
        .on('finish', () => resolve(uploadStream.id.toString()));
    });
  }

  async getImage(id: string): Promise<Buffer> {
    const objectId = new ObjectId(id);

    return new Promise((resolve, reject) => {
      const chunks = [];

      this.bucket
        .openDownloadStream(objectId)
        .on('data', (chunk) => chunks.push(chunk))
        .on('error', (error) => reject(error))
        .on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async deleteImage(id: string): Promise<void> {
    const objectId = new ObjectId(id);

    try {
      await this.bucket.delete(objectId);
    } catch (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }
}
