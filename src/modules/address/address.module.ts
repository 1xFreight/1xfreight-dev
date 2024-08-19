import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { AddressService } from './address.service';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb)],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
