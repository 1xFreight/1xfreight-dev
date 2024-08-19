import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Carrier, CarrierDocument } from './carrier.entity';
import { Model } from 'mongoose';

@Injectable()
export class CarrierService {
  constructor(
    @InjectModel(Carrier.name)
    private readonly _carrierModel: Model<CarrierDocument>,
  ) {}

  async create(carrier: Partial<Carrier>) {
    return (await this._carrierModel.create(carrier)).save();
  }
}
