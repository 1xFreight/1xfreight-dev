import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { CarrierService } from './carrier.service';
import { CarrierController } from './carrier.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb), HttpModule],
  providers: [CarrierService],
  controllers: [CarrierController],
  exports: [CarrierService],
})
export class CarrierModule {}
