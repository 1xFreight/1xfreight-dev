import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { FileSystemModule } from '../files/file.module';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb), FileSystemModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
