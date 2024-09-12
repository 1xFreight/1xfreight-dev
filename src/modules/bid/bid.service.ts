import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Bid, BidDocument } from './bid.entity';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';

@Injectable()
export class BidService {
  constructor(
    @InjectModel(Bid.name) private readonly _bidModel: Model<BidDocument>,
  ) {}

  async create(bid: Partial<Bid>) {
    return (await this._bidModel.create(bid)).save();
  }

  async declineBid(user_id: string, quote_id: string) {
    return this._bidModel.deleteOne({
      user_id: user_id,
      quote_id: quote_id,
    });
  }

  async findByQuote(quote_id: string) {
    return this._bidModel.find({ quote_id: quote_id }).exec();
  }

  async findOne(_id: string) {
    return this._bidModel.findOne({ _id: new ObjectId(_id) }).exec();
  }

  async findOneByUserAndQuote(user_id: string, quote_id: string) {
    return this._bidModel
      .findOne({
        user_id: user_id,
        quote_id: quote_id,
      })
      .exec();
  }

  async updateBidAmount(user_id: string, quote_id: string, amount: number) {
    return this._bidModel.updateOne({ user_id, quote_id }, { amount }).exec();
  }
}
