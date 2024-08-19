import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { CarrierService } from './carrier.service';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb)],
  providers: [CarrierService],
  exports: [CarrierService],
})
export class CarrierModule {}
