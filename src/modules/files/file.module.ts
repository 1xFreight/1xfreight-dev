import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileSystemService } from './file.service';
import { Image, ImageSchema } from './image.entity';
import * as process from 'process';
import { FileSystemController } from './file.controller';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_CONNECTION_STRING, {
      connectionName: 'DatabaseConnection',
    }),
    MongooseModule.forFeature(
      [{ name: Image.name, schema: ImageSchema }],
      'DatabaseConnection',
    ),
  ],
  providers: [FileSystemService],
  controllers: [FileSystemController],
  exports: [FileSystemService],
})
export class FileSystemModule {}
