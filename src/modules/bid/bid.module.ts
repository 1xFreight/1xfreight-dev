import { Module } from '@nestjs/common';
import { BidService } from './bid.service';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb)],
  providers: [BidService],
})
export class BidModule {}
