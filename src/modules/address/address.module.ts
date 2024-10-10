import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb), NotificationsModule],
  providers: [AddressService],
  exports: [AddressService],
  controllers: [AddressController],
})
export class AddressModule {}
