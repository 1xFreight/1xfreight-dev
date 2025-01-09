import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Bid, BidDocument } from './bid.entity';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BidService {
  constructor(
    @InjectModel(Bid.name) private readonly _bidModel: Model<BidDocument>,
    private readonly _notificationService: NotificationsService,
  ) {}

  async create(bid: Partial<Bid>) {
    const savedBid = await (await this._bidModel.create(bid)).save();

    this._notificationService.notifyNewQuoteFromCarrier(
      bid.user_id,
      bid.quote_id,
      savedBid._id.toString(),
    );

    return savedBid;
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
    const originalBid = await this._bidModel
      .findOne({ user_id, quote_id })
      .exec();

    await this._bidModel.updateOne({ user_id, quote_id }, { amount }).exec();

    await this._notificationService.notifyNewQuoteFromCarrier(
      user_id,
      quote_id,
      originalBid._id.toString(),
      {
        isAmountUpdated: true,
        oldAmount: originalBid.amount,
        amount,
      },
    );

    return true;
  }
}
