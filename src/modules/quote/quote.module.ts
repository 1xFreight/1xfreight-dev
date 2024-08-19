import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { QuoteService } from './quote.service';
import { AddressModule } from '../address/address.module';
import { QuoteController } from './quote.controller';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb), AddressModule],
  providers: [QuoteService],
  controllers: [QuoteController],
})
export class QuoteModule {}
