import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { FileSystemModule } from '../files/file.module';
import { UserAdminService } from './services/user-admin.service';
import { UserAdminController } from './controllers/user-admin.controller';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb), FileSystemModule],
  providers: [UserService, UserAdminService],
  controllers: [UserController, UserAdminController],
  exports: [UserService],
})
export class UserModule {}
