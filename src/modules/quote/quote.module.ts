import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { QuoteService } from './quote.service';
import { AddressModule } from '../address/address.module';
import { QuoteController } from './quote.controller';
import { BidModule } from '../bid/bid.module';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb), AddressModule, BidModule],
  providers: [QuoteService],
  controllers: [QuoteController],
  exports: [QuoteService],
})
export class QuoteModule {}
