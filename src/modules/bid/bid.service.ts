import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Bid, BidDocument } from './bid.entity';
import { Model } from 'mongoose';

@Injectable()
export class BidService {
  constructor(
    @InjectModel(Bid.name) private readonly _bidModel: Model<BidDocument>,
  ) {}

  async create(bid: Partial<Bid>) {
    return (await this._bidModel.create(bid)).save();
  }

  async findByQuote(quote_id: string) {
    return this._bidModel.find({ quote_id: quote_id }).exec();
  }
}
