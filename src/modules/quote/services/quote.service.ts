import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Quote, QuoteDocument } from '../entities/quote.entity';
import { Model, Types } from 'mongoose';
import { Shipment, ShipmentDocument } from '../entities/shipment.entity';
import { AddressService } from '../../address/address.service';
import { QuoteStatusEnum } from '../../common/enums/quote-status.enum';
import { User } from '../../user/entities/user.entity';
import { Template, TemplateDocument } from '../entities/template.entity';
import { PaginationWithFilters } from '../../common/interfaces/pagination.interface';
import { AddressTypeEnum } from '../../common/enums/address-type.enum';
import { UserRolesEnum } from '../../common/enums/roles.enum';
import { BidService } from '../../bid/bid.service';
import { ObjectId } from 'mongodb';
import * as XLSX from 'xlsx';
import {
  Carrier,
  CarrierDocument,
} from '../../carrier/entitites/carrier.entity';
import { Bid, BidDocument } from '../../bid/bid.entity';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private readonly _quoteModel: Model<QuoteDocument>,
    @InjectModel(Shipment.name)
    private readonly _shipmentModel: Model<ShipmentDocument>,
    @InjectModel(Template.name)
    private readonly _templateModel: Model<TemplateDocument>,
    @InjectModel(Carrier.name)
    private readonly _carrierModel: Model<CarrierDocument>,
    private readonly _addressService: AddressService,
    private readonly _bidService: BidService,
    @InjectModel(Bid.name) private readonly _bidModel: Model<BidDocument>,
    private readonly _notificationService: NotificationsService,
  ) {}

  async getUserQuotes(
    user: any,
    params: PaginationWithFilters,
    isCarrier: boolean = false,
  ) {
    let _aggregate: any[] = [];
    const sort = params.sortBy ? JSON.parse(params.sortBy) : { updatedAt: -1 };
    const allowedStatuses = params?.status?.length
      ? [params.status.toLowerCase()]
      : [QuoteStatusEnum.REQUESTED, QuoteStatusEnum.CANCELED];

    let matchStage: any = {
      $match: {
        $or: [
          { user_id: user._id },
          { referral_id: user._id },
          { subscribers: { $in: [user.email] } },
        ],
        $expr: {
          $in: ['$status', allowedStatuses],
        },
      },
    };

    if (params?.owner) {
      matchStage = {
        $match: {
          referral_id: user._id,
          user_id: { $in: params.owner.split(',') },
          $expr: {
            $in: ['$status', allowedStatuses],
          },
        },
      };
    }

    if (params?.id) {
      matchStage = {
        $match: {
          _id: new Types.ObjectId(params.id),
          $or: [
            { user_id: user._id },
            { referral_id: user._id },
            { referral_id: user.referral_id },
          ],
        },
      };
    }

    if (isCarrier) {
      matchStage = {
        $match: {
          $expr: {
            $and: [
              {
                $in: [user.email, { $ifNull: ['$subscribers', []] }],
              },
              {
                $in: ['$status', [QuoteStatusEnum.REQUESTED]],
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
                      { $eq: [{ $toString: '$user_id' }, user._id] },
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
                $lookup: {
                  from: 'carriers',
                  let: { userEmail: '$user.email' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: [{ $toString: '$user_id' }, user._id] },
                            { $eq: [{ $toString: '$email' }, '$$userEmail'] },
                          ],
                        },
                      },
                    },
                  ],
                  as: 'local_carrier',
                },
              },
              {
                $addFields: {
                  local_carrier: { $arrayElemAt: ['$local_carrier', 0] },
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
                  'local_carrier.name': 1,
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
      { $sort: sort },
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
        $addFields: {
          quote_id_str: { $toString: '$_id' },
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

    if (params?.type) {
      _aggregate.push({
        $match: {
          type: params.type.toUpperCase(),
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
      { $sort: { updatedAt: -1 } },
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
          bid_id_ibj: { $toObjectId: '$bid_id' },
        },
      },
      {
        $lookup: {
          from: 'carriers',
          localField: 'carrier.email',
          foreignField: 'email',
          as: 'local_carrier',
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
          local_carrier: { $arrayElemAt: ['$local_carrier', 0] },
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
          carrier_user_id_str: 0,
        },
      },
      {
        $addFields: {
          quote_id_str: { $toString: '$_id' },
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
          $addFields: {
            quote_id_str: { $toString: '$quote_data._id' },
          },
        },
        {
          $lookup: {
            from: 'items',
            localField: 'quote_id_str',
            foreignField: 'quote_id',
            as: 'quote_data.items',
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
    const bidData = (
      await this._bidModel
        .aggregate([
          {
            $match: {
              _id: new ObjectId(bid_id),
            },
          },
          {
            $addFields: {
              user_id_obj: { $toObjectId: '$user_id' },
              quote_id_obj: { $toObjectId: '$quote_id' },
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
            $lookup: {
              from: 'carriers',
              localField: 'carrier.email',
              foreignField: 'email',
              as: 'carrier_from_user',
            },
          },
          {
            $lookup: {
              from: 'quotes',
              localField: 'quote_id_obj',
              foreignField: '_id',
              as: 'quotes',
            },
          },
          {
            $limit: 1,
          },
        ])
        .exec()
    )[0];

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

  async addPoToQuote(
    user_id: string,
    references: Array<string>,
    quote_id: string,
  ) {
    return this._quoteModel.updateOne(
      {
        user_id: user_id,
        _id: quote_id,
      },
      {
        $push: { references: { $each: references } },
      },
    );
  }

  async changeCarrier(user_id: string, quote_id: string) {
    const quote = await this._quoteModel
      .findOne({ user_id, _id: quote_id })
      .exec();

    if (quote.status != QuoteStatusEnum.BOOKED) {
      throw new BadRequestException(
        `It is not possible to change carrier once the carrier is on its way.`,
      );
    }

    return this._quoteModel.updateOne(
      { user_id, _id: quote_id },
      { bid_id: null, carrier_id: null, status: QuoteStatusEnum.REQUESTED },
    );
  }

  async cancelLoad(user_id: string, quote_id: string) {
    const quote = await this._quoteModel
      .findOne({ user_id, _id: quote_id })
      .exec();

    if (
      quote.status != QuoteStatusEnum.BOOKED &&
      quote.status != QuoteStatusEnum.REQUESTED
    ) {
      throw new BadRequestException(
        `It is not possible to cancel a load once the carrier is on its way.`,
      );
    }

    return this._quoteModel
      .updateOne(
        { user_id, _id: quote_id },
        { status: QuoteStatusEnum.CANCELED },
      )
      .exec()
      .then(() => this._notificationService.notifyCancelLoad(quote_id));
  }
}
