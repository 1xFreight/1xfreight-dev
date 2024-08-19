import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Quote, QuoteDocument } from './entities/quote.entity';
import { Model } from 'mongoose';
import {
  QuoteSubscriber,
  QuoteSubscriberDocument,
} from './entities/quote-subscriber.entity';
import {
  QuoteReference,
  QuoteReferenceDocument,
} from './entities/quote-reference.entity';
import { Shipment, ShipmentDocument } from './entities/shipment.entity';
import { QuoteEnum } from '../common/enums/quote.enum';
import { AddressService } from '../address/address.service';
import { QuoteStatusEnum } from '../common/enums/quote-status.enum';
import { User } from '../user/entities/user.entity';
import { Template, TemplateDocument } from './entities/template.entity';

@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private readonly _quoteModel: Model<QuoteDocument>,
    @InjectModel(QuoteSubscriber.name)
    private readonly _qSubscriberModel: Model<QuoteSubscriberDocument>,
    @InjectModel(QuoteReference.name)
    private readonly _qReferenceModel: Model<QuoteReferenceDocument>,
    @InjectModel(Shipment.name)
    private readonly _shipmentModel: Model<ShipmentDocument>,
    @InjectModel(Template.name)
    private readonly _templateModel: Model<TemplateDocument>,
    private readonly _addressService: AddressService,
  ) {}

  async getUserQuotes(user_id: string, limit?: number) {
    const _aggregate: any[] = [
      { $match: { user_id: user_id } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'addresses',
          localField: '_id',
          foreignField: 'quote_id',
          as: 'addresses',
        },
      },
      {
        $lookup: {
          from: 'shipments',
          localField: '_id',
          foreignField: 'quote_id',
          as: 'details',
        },
      },
    ];

    if (limit) {
      _aggregate.push({
        $limit: Number(limit),
      });
    }
    return this._quoteModel.aggregate(_aggregate).exec();
  }

  async createQuoteFTL(quote: any, user: User) {
    const { pickup, drop, shipment_details, review, members, partners } = quote;

    console.log(shipment_details);

    const quoteObj = {
      type: QuoteEnum.FTL,
      status: QuoteStatusEnum.REQUESTED,
      user_id: user._id,
      quote_type: review.quote_type,
      currency: review.currency,
      deadline_date: review.deadline_date,
      deadline_time: review.deadline_time,
    };

    shipment_details?.references?.length
      ? (quoteObj['references'] = shipment_details?.references.map(
          ({ type, number }) => type + '/' + number,
        ))
      : '';

    const savedQuote = await (await this._quoteModel.create(quoteObj)).save();
    const quote_id = savedQuote._id;

    pickup.map((address) => {
      this._addressService.create({ ...address, quote_id });
    });

    drop.map((address) => {
      this._addressService.create({ ...address, quote_id });
    });

    (
      await this._shipmentModel.create({ ...shipment_details, quote_id })
    ).save();

    if (review?.save_template && review?.template_name) {
      (
        await this._templateModel.create({
          quote_id,
          name: review.template_name,
          user_id: user._id,
        })
      ).save;
    }
  }

  async getUserTemplates(user_id: string) {
    return this._templateModel
      .aggregate([
        {
          $match: { user_id: user_id },
        },
        {
          $lookup: {
            from: 'quotes', // Assuming your quotes collection is named 'quotes'
            localField: 'quote_id',
            foreignField: '_id',
            as: 'quote_data',
          },
        },
        {
          $unwind: '$quote_data', // Unwind the populated quotes
        },
        {
          $lookup: {
            from: 'addresses',
            localField: 'quote_data._id', // Using the _id from the populated quote
            foreignField: 'quote_id',
            as: 'quote_data.addresses',
          },
        },
        {
          $lookup: {
            from: 'shipments',
            localField: 'quote_data._id', // Using the _id from the populated quote
            foreignField: 'quote_id',
            as: 'quote_data.details',
          },
        },
        {
          $group: {
            _id: '$_id',
            user_id: { $first: '$user_id' },
            quote_id: { $first: '$quote_id' },
            name: { $first: '$name' },
            quote_data: { $first: '$quote_data' },
          },
        },
      ])
      .exec();
  }
}
