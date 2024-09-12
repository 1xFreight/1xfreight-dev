import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ImageDocument, Image } from './image.entity';
import { Readable } from 'stream';
import { GridFSBucket, ObjectId } from 'mongodb';

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

  async getImage(
    id: string,
  ): Promise<{ data: Buffer; filename: string; contentType: string }> {
    const objectId = new ObjectId(id);

    try {
      // Find file metadata using the promise-based approach
      const files = await this.bucket.find({ _id: objectId }).toArray();

      if (!files || files.length === 0) {
        throw new Error('File not found');
      }

      const file = files[0];
      const filename = file.filename;
      const contentType = file.contentType || 'application/octet-stream';

      const chunks: Buffer[] = [];

      // Stream the file data
      return new Promise((resolve, reject) => {
        this.bucket
          .openDownloadStream(objectId)
          .on('data', (chunk) => chunks.push(chunk))
          .on('error', (error) => reject(error))
          .on('end', () => {
            const data = Buffer.concat(chunks);
            resolve({ data, filename, contentType });
          });
      });
    } catch (error) {
      throw new Error(`Failed to retrieve file: ${error.message}`);
    }
  }

  async deleteImage(id: string): Promise<void> {
    const objectId = new ObjectId(id);

    try {
      await this.bucket.delete(objectId);
    } catch (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  async getFileData(id: string) {
    return this.imageModel.findOne({ _id: new ObjectId(id) });
  }
}
