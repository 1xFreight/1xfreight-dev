import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Quote, QuoteDocument } from './entities/quote.entity';
import { Model, Types } from 'mongoose';
import { Shipment, ShipmentDocument } from './entities/shipment.entity';
import { QuoteEnum } from '../common/enums/quote.enum';
import { AddressService } from '../address/address.service';
import { QuoteStatusEnum } from '../common/enums/quote-status.enum';
import { User } from '../user/entities/user.entity';
import { Template, TemplateDocument } from './entities/template.entity';
import { PaginationWithFilters } from '../common/interfaces/pagination.interface';
import { AddressTypeEnum } from '../common/enums/address-type.enum';
import { UserRolesEnum } from '../common/enums/roles.enum';
import { BidService } from '../bid/bid.service';
import { ObjectId } from 'mongodb';
import * as XLSX from 'xlsx';

@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private readonly _quoteModel: Model<QuoteDocument>,
    @InjectModel(Shipment.name)
    private readonly _shipmentModel: Model<ShipmentDocument>,
    @InjectModel(Template.name)
    private readonly _templateModel: Model<TemplateDocument>,
    private readonly _addressService: AddressService,
    private readonly _bidService: BidService,
  ) {}

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
        $limit: 1,
      },
      {
        $project: {
          user_id_obj: 0,
        },
      },
    ];

    return (await this._quoteModel.aggregate(_aggregate).exec())[0];
  }

  async getUserQuotes(
    user_id: string,
    params: PaginationWithFilters,
    isCarrier: any = null,
  ) {
    let _aggregate: any[] = [];
    let matchStage: any = {
      $match: {
        $or: [{ user_id: user_id }, { referral_id: user_id }],
        $expr: {
          $in: [
            '$status',
            [QuoteStatusEnum.REQUESTED, QuoteStatusEnum.CANCELED],
          ],
        },
      },
    };

    if (params?.owner) {
      matchStage = {
        $match: {
          referral_id: user_id,
          user_id: { $in: params.owner.split(',') },
          $expr: {
            $in: [
              '$status',
              [QuoteStatusEnum.REQUESTED, QuoteStatusEnum.CANCELED],
            ],
          },
        },
      };
    }

    if (params?.id) {
      matchStage = {
        $match: {
          _id: new Types.ObjectId(params.id),
          $or: [{ user_id: user_id }, { referral_id: user_id }],
          $expr: {
            $in: [
              '$status',
              [QuoteStatusEnum.REQUESTED, QuoteStatusEnum.CANCELED],
            ],
          },
        },
      };
    }

    if (isCarrier) {
      matchStage = {
        $match: {
          $expr: {
            $and: [
              {
                $in: [isCarrier.email, { $ifNull: ['$subscribers', []] }],
              },
              {
                $in: [
                  '$status',
                  [QuoteStatusEnum.REQUESTED, QuoteStatusEnum.CANCELED],
                ],
              },
            ],
          },
        },
      };

      _aggregate.push(
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
          $project: {
            user_id_obj: 0,
          },
        },
        {
          $lookup: {
            from: 'bids',
            let: { quote_id: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: [{ $toString: '$user_id' }, user_id] },
                      { $eq: [{ $toString: '$quote_id' }, '$$quote_id'] },
                    ],
                  },
                },
              },
            ],
            as: 'carrier_bid',
          },
        },
        {
          $addFields: {
            carrier_bid: { $arrayElemAt: ['$carrier_bid', 0] },
          },
        },
      );
    } else {
      _aggregate.push(
        {
          $addFields: {
            id_str1: { $toString: '$_id' },
          },
        },
        {
          $lookup: {
            from: 'bids',
            localField: 'id_str1',
            foreignField: 'quote_id',
            as: 'bids',
            pipeline: [
              {
                $addFields: {
                  id_obj: { $toObjectId: '$user_id' },
                },
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'id_obj',
                  foreignField: '_id',
                  as: 'user',
                },
              },
              {
                $unwind: {
                  path: '$user',
                },
              },
              {
                $project: {
                  'user.name': 1,
                  'user.email': 1,
                  valid_until: 1,
                  amount: 1,
                  transit_time: 1,
                  notes: 1,
                  _id: 1,
                  quote_id: 1,
                },
              },
            ],
          },
        },
      );
    }

    _aggregate = [
      ..._aggregate,
      matchStage,
      { $sort: { createdAt: -1 } },
      {
        $project: {
          subscribers: 0,
          declined: 0,
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
    ];

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

    if (params?.pickupDate) {
      _aggregate.push({
        $match: {
          addresses: {
            $elemMatch: {
              date: { $regex: `^${params.pickupDate}`, $options: 'i' },
              address_type: AddressTypeEnum.PICK,
            },
          },
        },
      });
    }

    if (params?.dropDate) {
      _aggregate.push({
        $match: {
          addresses: {
            $elemMatch: {
              date: { $regex: `^${params.dropDate}`, $options: 'i' },
              address_type: AddressTypeEnum.DROP,
            },
          },
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

  async getShipments(user_id: string, params: PaginationWithFilters) {
    let _aggregate: any[] = [];
    let matchStage: any = {
      $match: {
        $or: [{ user_id: user_id }, { referral_id: user_id }],
        $expr: {
          $not: {
            $in: [
              '$status',
              [QuoteStatusEnum.REQUESTED, QuoteStatusEnum.CANCELED],
            ],
          },
        },
      },
    };

    if (params?.owner) {
      matchStage = {
        $match: {
          referral_id: user_id,
          user_id: { $in: params.owner.split(',') },
        },
      };
    }

    if (params?.id) {
      matchStage = {
        $match: {
          _id: new Types.ObjectId(params.id),
          $or: [{ user_id: user_id }, { referral_id: user_id }],
        },
      };
    }

    _aggregate = [
      ..._aggregate,
      matchStage,
      { $sort: { createdAt: -1 } },
      {
        $project: {
          subscribers: 0,
          declined: 0,
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
          user_id_obj: { $toObjectId: '$carrier_id' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id_obj',
          foreignField: '_id',
          as: 'carrier',
        },
      },
      {
        $addFields: {
          carrier: { $arrayElemAt: ['$carrier', 0] },
        },
      },
      {
        $addFields: {
          bid_id_ibj: { $toObjectId: '$bid_id' },
        },
      },
      {
        $lookup: {
          from: 'bids',
          localField: 'bid_id_ibj',
          foreignField: '_id',
          as: 'bid',
        },
      },
      {
        $addFields: {
          bid: { $arrayElemAt: ['$bid', 0] },
        },
      },
      {
        $project: {
          'carrier.name': 0,
          'carrier.password': 0,
          'carrier.auto_commodity': 0,
          'carrier.auto_delivery': 0,
          'carrier.auto_pickup': 0,
          'carrier.default_comment': 0,
          'carrier.equipments': 0,
          'carrier.position': 0,
          'carrier.currency': 0,
          bid_id: 0,
          bid_id_ibj: 0,
        },
      },
    ];

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

    if (params?.pickupDate) {
      _aggregate.push({
        $match: {
          addresses: {
            $elemMatch: {
              date: { $regex: `^${params.pickupDate}`, $options: 'i' },
              address_type: AddressTypeEnum.PICK,
            },
          },
        },
      });
    }

    if (params?.dropDate) {
      _aggregate.push({
        $match: {
          addresses: {
            $elemMatch: {
              date: { $regex: `^${params.dropDate}`, $options: 'i' },
              address_type: AddressTypeEnum.DROP,
            },
          },
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

  async createQuoteFTL(quote: any, user: User) {
    const { pickup, drop, shipment_details, review, subscribers, equipments } =
      quote;

    const onlyAddress = [...pickup, ...drop].map(({ address }) => address);
    const total_miles =
      await this._addressService.calcAddressesDistance(onlyAddress);

    const quoteObj = {
      type: QuoteEnum.FTL,
      status: QuoteStatusEnum.REQUESTED,
      user_id: user._id,
      quote_type: review.quote_type,
      currency: review.currency,
      deadline_date: review.deadline_date,
      deadline_time: review.deadline_time,
      subscribers,
      equipments,
      total_miles,
      load_number: shipment_details.load_number ?? 1,
    };

    if (user.referral_id) {
      quoteObj['referral_id'] = user.referral_id;
    }

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
            from: 'quotes',
            localField: 'quote_id',
            foreignField: '_id',
            as: 'quote_data',
          },
        },
        {
          $unwind: '$quote_data',
        },
        {
          $lookup: {
            from: 'addresses',
            localField: 'quote_data._id',
            foreignField: 'quote_id',
            as: 'quote_data.addresses',
          },
        },
        {
          $lookup: {
            from: 'shipments',
            localField: 'quote_data._id',
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

  async deleteTemplate(user_id: string, template_id: string) {
    return this._templateModel.deleteOne({
      user_id: user_id,
      _id: template_id,
    });
  }

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

  async verifyUserAccessToRoom(user: Partial<User>, room: string) {
    const ids = room.split(':');
    const quote_id = ids[0];
    const bid_id = ids[1];

    if (user.role === UserRolesEnum.CARRIER) {
      const bid = await this._bidService.findOne(bid_id);
      if (!bid) return false;
      return bid.user_id == user._id.toString() && quote_id == bid.quote_id;
    }

    const quote: any = await this._quoteModel
      .findOne({ _id: new ObjectId(quote_id) })
      .exec();
    if (user._id.toString() == quote.user_id) {
      return true;
    }

    return false;
  }

  async acceptQuote(quote_id: string, bid_id: string) {
    const bidData = await this._bidService.findOne(bid_id);

    return await this._quoteModel
      .updateOne(
        { _id: new ObjectId(quote_id) },
        {
          status: QuoteStatusEnum.BOOKED,
          bid_id: bid_id,
          carrier_id: bidData.user_id,
        },
      )
      .exec();
  }

  async exportToExcel(
    res: Response,
    user_id: string,
    params: PaginationWithFilters,
  ) {
    let _aggregate: any[] = [];
    let matchStage: any = {
      $match: {
        $or: [{ user_id: user_id }, { referral_id: user_id }],
        $expr: {
          $not: {
            $in: [
              '$status',
              [QuoteStatusEnum.REQUESTED, QuoteStatusEnum.CANCELED],
            ],
          },
        },
      },
    };

    if (params?.owner) {
      matchStage = {
        $match: {
          referral_id: user_id,
          user_id: { $in: params.owner.split(',') },
        },
      };
    }

    if (params?.id) {
      matchStage = {
        $match: {
          _id: new Types.ObjectId(params.id),
          $or: [{ user_id: user_id }, { referral_id: user_id }],
        },
      };
    }

    _aggregate = [
      ..._aggregate,
      matchStage,
      { $sort: { createdAt: -1 } },
      {
        $project: {
          subscribers: 0,
          declined: 0,
        },
      },
      {
        $addFields: {
          user_id_obj: { $toObjectId: '$carrier_id' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id_obj',
          foreignField: '_id',
          as: 'carrier',
        },
      },
      {
        $addFields: {
          carrier: { $arrayElemAt: ['$carrier', 0] },
        },
      },
      {
        $addFields: {
          bid_id_ibj: { $toObjectId: '$bid_id' },
        },
      },
      {
        $lookup: {
          from: 'bids',
          localField: 'bid_id_ibj',
          foreignField: '_id',
          as: 'bid',
        },
      },
      {
        $addFields: {
          bid: { $arrayElemAt: ['$bid', 0] },
          full_id: { $toString: '$_id' },
        },
      },
      {
        $addFields: {
          carrier: '$carrier.email',
          total_amount: {
            $multiply: ['$bid.amount', '$load_number'],
          },
          per_load: '$bid.amount',
          load_id: {
            $substrBytes: [
              '$full_id',
              { $subtract: [{ $strLenBytes: '$full_id' }, 7] },
              7,
            ],
          },
        },
      },
      {
        $project: {
          load_id: 1,
          full_id: 1,
          quote_type: 1,
          status: 1,
          total_miles: 1,
          total_amount: 1,
          per_load: 1,
          currency: 1,
          carrier: 1,
          deadline_date: 1,
          deadline_time: 1,
          _id: 0,
        },
      },
    ];

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

    if (params?.pickupDate) {
      _aggregate.push({
        $match: {
          addresses: {
            $elemMatch: {
              date: { $regex: `^${params.pickupDate}`, $options: 'i' },
              address_type: AddressTypeEnum.PICK,
            },
          },
        },
      });
    }

    if (params?.dropDate) {
      _aggregate.push({
        $match: {
          addresses: {
            $elemMatch: {
              date: { $regex: `^${params.dropDate}`, $options: 'i' },
              address_type: AddressTypeEnum.DROP,
            },
          },
        },
      });
    }

    const data = await this._quoteModel.aggregate(_aggregate).exec();

    console.log(data);

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Create a new workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Write the workbook to a buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    });

    return excelBuffer;
  }
}
