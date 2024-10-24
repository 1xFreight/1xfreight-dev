import { Module } from '@nestjs/common';
import { BidService } from './bid.service';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { BidController } from './bid.controller';
import { AddressModule } from '../address/address.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature(forFeatureDb),
    AddressModule,
    NotificationsModule,
  ],
  providers: [BidService],
  controllers: [BidController],
  exports: [BidService],
})
export class BidModule {}
