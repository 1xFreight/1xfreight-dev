import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Quote, QuoteDocument } from '../entities/quote.entity';
import { Model, Types } from 'mongoose';
import { Shipment, ShipmentDocument } from '../entities/shipment.entity';
import { Template, TemplateDocument } from '../entities/template.entity';
import { AddressService } from '../../address/address.service';
import { BidService } from '../../bid/bid.service';
import { PaginationWithFilters } from '../../common/interfaces/pagination.interface';
import { QuoteStatusEnum } from '../../common/enums/quote-status.enum';
import { ObjectId } from 'mongodb';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class QuoteCarrierService {
  constructor(
    @InjectModel(Quote.name) private readonly _quoteModel: Model<QuoteDocument>,
    @InjectModel(Shipment.name)
    private readonly _shipmentModel: Model<ShipmentDocument>,
    @InjectModel(Template.name)
    private readonly _templateModel: Model<TemplateDocument>,
    private readonly _addressService: AddressService,
    private readonly _bidService: BidService,
    private readonly _notificationService: NotificationsService,
  ) {}

  async declineQuote(carrier_email: string, quote_id: string) {
    try {
      await this._quoteModel.updateOne(
        { _id: quote_id },
        {
          $pull: { subscribers: carrier_email },
          $push: { declined: carrier_email },
        },
      );

      return true;
    } catch (e) {
      return false;
    }
  }

  async getCarrierActiveLoads(user_id: string, params: PaginationWithFilters) {
    let sort: any = { updatedAt: -1 };

    if (params.sort) {
      // Check if params.sort is a string and can be parsed
      if (typeof params.sort === 'string') {
        try {
          const sortObj = JSON.parse(params.sort);
          if (sortObj && Object.keys(sortObj).length) {
            sort = sortObj;
          }
        } catch (error) {
          console.error('Invalid JSON in sort parameter:', error);
        }
      } else if (typeof params.sort === 'object') {
        // If it's already an object, assign it directly
        sort = params.sort;
      }
    }

    const _aggregate: any[] = [
      {
        $match: {
          carrier_id: user_id,
        },
      },
      {
        $lookup: {
          from: 'addresses',
          localField: '_id',
          foreignField: 'quote_id',
          as: 'addresses',
          pipeline: [
            {
              $sort: { order: 1 },
            },
            {
              $group: {
                _id: '$address_type',
                addresses: { $push: '$$ROOT' },
              },
            },

            {
              $unwind: '$addresses',
            },
            {
              $replaceRoot: { newRoot: '$addresses' },
            },
          ],
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
      {
        $addFields: {
          user_id_obj: { $toObjectId: '$user_id' },
          bid_id_obj: { $toObjectId: '$bid_id' },
          quote_id_str: { $toString: '$_id' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id_obj',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                name: 1,
                logo: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'bids',
          localField: 'bid_id_obj',
          foreignField: '_id',
          as: 'carrier_bid',
        },
      },
      {
        $addFields: {
          carrier_bid: { $arrayElemAt: ['$carrier_bid', 0] },
          author: { $arrayElemAt: ['$user', 0] },
          quote_id_short: {
            $substrBytes: [
              '$quote_id_str',
              { $subtract: [{ $strLenBytes: '$quote_id_str' }, 7] },
              7,
            ],
          },
          details_: {
            $arrayElemAt: ['$details', 0],
          },
        },
      },
      {
        $addFields: {
          details_goods_value_str: {
            $toString: '$details_.goods_value',
          },
          details_weight_str: {
            $toString: '$details_.weight',
          },
          carrier_bid_amount_str: {
            $toString: '$carrier_bid.amount',
          },
        },
      },
      {
        $project: {
          user_id_obj: 0,
          bid_id_obj: 0,
          decline: 0,
          subscribers: 0,
          details_: 0,
        },
      },
      {
        $addFields: {
          // Adding the firstPickup field
          firstPickup: {
            $first: {
              $filter: {
                input: '$addresses',
                as: 'address',
                cond: {
                  $and: [
                    { $eq: ['$$address.address_type', 'pickup'] }, // Match address_type = 'pickup'
                    { $eq: ['$$address.order', 1] }, // Match order = 1
                  ],
                },
              },
            },
          },
          // Adding the firstDrop field
          firstDrop: {
            $first: {
              $filter: {
                input: '$addresses',
                as: 'address',
                cond: {
                  $and: [
                    { $eq: ['$$address.address_type', 'drop'] }, // Match address_type = 'pickup'
                    { $eq: ['$$address.order', 1] }, // Match order = 1
                  ],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          quote_id_str: { $toString: '$_id' },
          'firstPickup.dateAsDate': {
            $dateFromString: {
              dateString: '$firstPickup.date', // Properly wrapping the date string in an object
            },
          },
          'firstDrop.dateAsDate': {
            $dateFromString: {
              dateString: '$firstDrop.date', // Properly wrapping the date string in an object
            },
          },
        },
      },
      {
        $sort: sort,
      },
    ];

    if (params.limit == 1) {
      _aggregate.push({
        $match: {
          status: {
            $nin: [QuoteStatusEnum.CANCELED],
          },
        },
      });
    } else {
      _aggregate.push({
        $match: {
          status: {
            $nin: [QuoteStatusEnum.CANCELED, QuoteStatusEnum.DELIVERED],
          },
        },
      });
    }

    if (params?.id) {
      const objId = new ObjectId(params.id);

      _aggregate.push({
        $match: {
          _id: objId,
        },
      });
    }

    if (params?.searchText) {
      _aggregate.push({
        $match: {
          $or: [
            {
              'addresses.address': {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              'addresses.company_name': {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              quote_id_short: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              type: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              equipments: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              references: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              details_goods_value_str: {
                $regex: `^${params?.searchText}`,
                $options: 'i',
              },
            },
            {
              details_weight_str: {
                $regex: `^${params?.searchText}`,
                $options: 'i',
              },
            },
            {
              carrier_bid_amount_str: {
                $regex: `^${params?.searchText}`,
                $options: 'i',
              },
            },
            {
              status: {
                $regex: `^${params?.searchText}`,
                $options: 'i',
              },
            },
          ],
        },
      });
    }

    const totalQuotes =
      (await this._quoteModel.aggregate(_aggregate).count('total').exec())[0]
        ?.total || 0;

    if (params?.skip && params?.skip != 0) {
      _aggregate.push({ $skip: Number(params.skip) });
    }

    if (params?.limit) {
      _aggregate.push({ $limit: Number(params.limit) });
    }

    const quotes = await this._quoteModel.aggregate(_aggregate).exec();

    return {
      totalQuotes,
      quotes,
    };
  }

  async getOneQuoteCarrier(quote_id: string, user_email: string) {
    const _aggregate: any[] = [
      {
        $match: {
          _id: new Types.ObjectId(quote_id),
          $expr: {
            $in: [user_email, { $ifNull: ['$subscribers', []] }],
          },
        },
      },
      {
        $lookup: {
          from: 'addresses',
          localField: '_id',
          foreignField: 'quote_id',
          as: 'addresses',
          pipeline: [
            {
              $sort: { order: 1 },
            },
            {
              $group: {
                _id: '$address_type',
                addresses: { $push: '$$ROOT' },
              },
            },

            {
              $unwind: '$addresses',
            },
            {
              $replaceRoot: { newRoot: '$addresses' },
            },
            {
              $addFields: {
                address: '$partial_address',
              },
            },
            {
              $project: {
                address: 1,
                date: 1,
                address_type: 1,
                shipping_hours: 1,
                time_start: 1,
                time_end: 1,
                notes: 1,
                accessorials: 1,
              },
            },
          ],
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
      {
        $addFields: {
          user_id_obj: { $toObjectId: '$user_id' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id_obj',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                name: 1,
                logo: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          quote_id_str: { $toString: '$_id' },
          author: { $arrayElemAt: ['$user', 0] },
        },
      },
      {
        $addFields: {
          quote_id_short: {
            $substrBytes: [
              '$quote_id_str',
              { $subtract: [{ $strLenBytes: '$quote_id_str' }, 7] },
              7,
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'items',
          localField: 'quote_id_str',
          foreignField: 'quote_id',
          as: 'items',
        },
      },
      {
        $limit: 1,
      },
      {
        $project: {
          user_id_obj: 0,
          references: 0,
          subscribers: 0,
          declined: 0,
        },
      },
    ];

    return (await this._quoteModel.aggregate(_aggregate).exec())[0];
  }

  async changeQuoteStatusByCarrier(
    user_id: string,
    quote_id: string,
    user_email: string,
    arrival_text: string | null,
  ) {
    const quoteQ = await this._quoteModel
      .aggregate([
        {
          $match: {
            carrier_id: user_id,
            _id: new ObjectId(quote_id),
          },
        },
        {
          $lookup: {
            from: 'addresses',
            localField: '_id',
            foreignField: 'quote_id',
            as: 'addresses',
          },
        },
        {
          $limit: 1,
        },
      ])
      .exec();

    if (!quoteQ.length) return;

    const quote = quoteQ[0];

    const notifyStatusUpdate = () => {
      this._notificationService.notifyStatusUpdate(
        quote_id,
        null,
        null,
        user_email,
        arrival_text,
      );
    };

    if (quote.status == QuoteStatusEnum.AT_PICKUP) {
      const pickup = quote.addresses.filter(
        ({ address_type }) => address_type == 'pickup',
      );

      let fulfilledAddresses = 0;

      pickup.map((address) => {
        address.arrival_time ? (fulfilledAddresses += 1) : '';
      });

      if (fulfilledAddresses != pickup.length) return notifyStatusUpdate();
    }

    if (quote.status == QuoteStatusEnum.AT_DESTINATION) {
      const drop = quote.addresses.filter(
        ({ address_type }) => address_type == 'drop',
      );

      let fulfilledAddresses = 0;

      drop.map((address) => {
        address.arrival_time ? (fulfilledAddresses += 1) : '';
      });
      if (fulfilledAddresses != drop.length) return notifyStatusUpdate();
    }

    if (quote.status == QuoteStatusEnum.DELIVERED) return;

    const currentStatusIndex = [...Object.values(QuoteStatusEnum)].indexOf(
      quote.status as QuoteStatusEnum,
    );
    const nextStatusKey = [...Object.keys(QuoteStatusEnum)][
      currentStatusIndex + 1
    ];
    const nextStatus = QuoteStatusEnum[nextStatusKey];

    this._notificationService.notifyStatusUpdate(
      quote_id,
      quote.status,
      nextStatus,
      user_email,
      arrival_text,
    );

    return this._quoteModel
      .updateOne(
        {
          carrier_id: user_id,
          _id: new ObjectId(quote_id),
        },
        { status: nextStatus },
      )
      .exec();
  }

  async getCarrierHistory(user_id: string, params: PaginationWithFilters) {
    const _aggregate: any[] = [
      { $sort: { createdAt: -1 } },
      {
        $match: {
          carrier_id: user_id,
          status: {
            $in: [QuoteStatusEnum.CANCELED, QuoteStatusEnum.DELIVERED],
          },
        },
      },
      {
        $lookup: {
          from: 'addresses',
          localField: '_id',
          foreignField: 'quote_id',
          as: 'addresses',
          pipeline: [
            {
              $sort: { order: 1 },
            },
            {
              $group: {
                _id: '$address_type',
                addresses: { $push: '$$ROOT' },
              },
            },

            {
              $unwind: '$addresses',
            },
            {
              $replaceRoot: { newRoot: '$addresses' },
            },
          ],
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
      {
        $addFields: {
          user_id_obj: { $toObjectId: '$user_id' },
          bid_id_obj: { $toObjectId: '$bid_id' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id_obj',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                name: 1,
                logo: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'bids',
          localField: 'bid_id_obj',
          foreignField: '_id',
          as: 'carrier_bid',
        },
      },
      {
        $addFields: {
          carrier_bid: { $arrayElemAt: ['$carrier_bid', 0] },
        },
      },
      {
        $project: {
          user_id_obj: 0,
          bid_id_obj: 0,
        },
      },
    ];

    if (params?.id) {
      const objId = new ObjectId(params.id);

      _aggregate.push({
        $match: {
          _id: objId,
        },
      });
    }

    if (params?.searchText) {
      _aggregate.push({
        $match: {
          $or: [
            {
              'addresses.address': {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            { references: { $regex: params?.searchText, $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$_id' },
                  regex: `${params?.searchText}$`,
                  options: 'i',
                },
              },
            },
          ],
        },
      });
    }

    const totalQuotes =
      (await this._quoteModel.aggregate(_aggregate).count('total').exec())[0]
        ?.total || 0;

    if (params?.skip && params?.skip != 0) {
      _aggregate.push({ $skip: Number(params.skip) });
    }

    if (params?.limit) {
      _aggregate.push({ $limit: Number(params.limit) });
    }

    const quotes = await this._quoteModel.aggregate(_aggregate).exec();

    return {
      totalQuotes,
      quotes,
    };
  }
}
