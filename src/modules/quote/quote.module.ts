import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { QuoteService } from './services/quote.service';
import { AddressModule } from '../address/address.module';
import { QuoteController } from './controllers/quote.controller';
import { BidModule } from '../bid/bid.module';
import { QuoteCarrierService } from './services/quote-carrier.service';
import { QuoteCarrierController } from './controllers/quote-carrier.controller';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb), AddressModule, BidModule],
  providers: [QuoteService, QuoteCarrierService],
  controllers: [QuoteController, QuoteCarrierController],
  exports: [QuoteService],
})
export class QuoteModule {}
