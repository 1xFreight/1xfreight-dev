import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Quote, QuoteDocument } from '../quote/entities/quote.entity';
import { Model } from 'mongoose';
import { QuoteEnum } from '../common/enums/quote.enum';
import { QuoteStatusEnum } from '../common/enums/quote-status.enum';
import { CurrencyEnum } from '../common/enums/currency.enum';
import { Carrier, CarrierDocument } from '../carrier/entitites/carrier.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import { PaginationWithFilters } from '../common/interfaces/pagination.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Quote.name) private readonly _quoteModel: Model<QuoteDocument>,
    @InjectModel(Carrier.name)
    private readonly _carrierModel: Model<CarrierDocument>,
    @InjectModel(User.name)
    private readonly _userModel: Model<UserDocument>,
  ) {}

  async userQuotesAnalytics(user_id: string) {
    return await this._quoteModel
      .aggregate([
        {
          $match: {
            $or: [{ user_id: user_id }, { referral_id: user_id }],
          },
        },
        {
          $group: {
            _id: null,
            quotes: { $push: '$$ROOT' },
            quotes_number: { $sum: 1 },
            ftl: {
              $sum: {
                $cond: [{ $eq: ['$type', QuoteEnum.FTL] }, 1, 0],
              },
            },
            ltl: {
              $sum: {
                $cond: [{ $eq: ['$type', QuoteEnum.LTL] }, 1, 0],
              },
            },
            air: {
              $sum: {
                $cond: [{ $eq: ['$type', QuoteEnum.AIR] }, 1, 0],
              },
            },
            fcl: {
              $sum: {
                $cond: [{ $eq: ['$type', QuoteEnum.FCL] }, 1, 0],
              },
            },
          },
        },
        {
          $addFields: {
            user_id: user_id,
            user_id_obj: {
              $toObjectId: user_id,
            },
          },
        },
        {
          $lookup: {
            from: 'carriers',
            localField: 'user_id',
            foreignField: 'user_id',
            as: 'carriers',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: 'referral_id',
            as: 'team_members',
          },
        },
        {
          $addFields: {
            carriers: {
              $size: '$carriers',
            },
            team_members: {
              $size: '$team_members',
            },
          },
        },
        {
          $project: {
            _id: 0,
            quotes_number: 1,
            ftl: 1,
            ltl: 1,
            air: 1,
            fcl: 1,
            carriers: 1,
            team_members: 1,
          },
        },
      ])
      .exec();
  }

  async calculateAnalyticsPerCarrier(
    user_id: string,
    params: PaginationWithFilters,
  ) {
    const _aggregate = [];
    const _aggregateForQuotes = [];

    if (params.startDate) {
      const startDate = new Date(params.startDate);
      startDate.setHours(0, 0, 0, 0);

      _aggregateForQuotes.push({
        $match: {
          createdAt: {
            $gte: startDate,
          },
        },
      });
    }

    if (params.endDate) {
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 0);

      _aggregateForQuotes.push({
        $match: {
          createdAt: {
            $lt: endDate,
          },
        },
      });
    }

    if (params?.searchText) {
      _aggregate.push({
        $match: {
          $or: [
            {
              'carrier_user.name': {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
          ],
        },
      });
    }

    const carriers = await this._carrierModel.aggregate([
      {
        $match: {
          user_id,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'email',
          foreignField: 'email',
          as: 'carrier_user',
        },
      },
      {
        $addFields: {
          carrier_user: {
            $arrayElemAt: ['$carrier_user', 0],
          },
        },
      },
      ..._aggregate,
      {
        $addFields: {
          carrier_user_id_str: {
            $toString: '$carrier_user._id',
          },
          currency_type: 'daily',
        },
      },
      {
        $lookup: {
          from: 'currencies',
          as: 'currency_daily',
          localField: 'currency_type',
          foreignField: 'type',
        },
      },
      {
        $addFields: {
          currency_daily: {
            $arrayElemAt: ['$currency_daily', 0],
          },
        },
      },
      {
        $lookup: {
          from: 'quotes',
          localField: 'carrier_user_id_str',
          foreignField: 'carrier_id',
          as: 'carrier_quotes',
          pipeline: [
            {
              $match: {
                status: QuoteStatusEnum.DELIVERED,
              },
            },
            ..._aggregateForQuotes,
            {
              $addFields: {
                bid_id_obj: {
                  $toObjectId: '$bid_id',
                },
                quote_id_str: {
                  $toString: '$_id',
                },
              },
            },
            {
              $lookup: {
                from: 'shipments',
                as: 'details',
                localField: '_id',
                foreignField: 'quote_id',
              },
            },
            {
              $lookup: {
                as: 'carrier_bid',
                from: 'bids',
                foreignField: '_id',
                localField: 'bid_id_obj',
              },
            },
            {
              $lookup: {
                as: 'addresses',
                from: 'addresses',
                foreignField: 'quote_id',
                localField: '_id',
              },
            },
            {
              $addFields: {
                carrier_bid: {
                  $arrayElemAt: ['$carrier_bid', 0],
                },
                details: {
                  $arrayElemAt: ['$details', 0],
                },
                number_of_pickups: {
                  $size: {
                    $filter: {
                      input: '$addresses',
                      as: 'address',
                      cond: {
                        $and: [{ $eq: ['$$address.address_type', 'pickup'] }],
                      },
                    },
                  },
                },
                number_of_drops: {
                  $size: {
                    $filter: {
                      input: '$addresses',
                      as: 'address',
                      cond: {
                        $and: [{ $eq: ['$$address.address_type', 'drop'] }],
                      },
                    },
                  },
                },
                on_time_pickup: {
                  $size: {
                    $filter: {
                      input: '$addresses',
                      as: 'address',
                      cond: {
                        $and: [
                          { $eq: ['$$address.arrival_status', 'on_time'] },
                          { $eq: ['$$address.address_type', 'pickup'] },
                        ],
                      },
                    },
                  },
                },
                on_time_drop: {
                  $size: {
                    $filter: {
                      input: '$addresses',
                      as: 'address',
                      cond: {
                        $and: [
                          { $eq: ['$$address.arrival_status', 'on_time'] },
                          { $eq: ['$$address.address_type', 'drop'] },
                        ],
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          mxn_total: {
            $reduce: {
              input: '$carrier_quotes',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.currency', 'MXN'] },
                  {
                    $add: [
                      '$$value',
                      { $ifNull: ['$$this.carrier_bid.amount', 0] },
                    ],
                  },
                  '$$value',
                ],
              },
            },
          },
          usd_total: {
            $reduce: {
              input: '$carrier_quotes',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.currency', 'USD'] },
                  {
                    $add: [
                      '$$value',
                      { $ifNull: ['$$this.carrier_bid.amount', 0] },
                    ],
                  },
                  '$$value',
                ],
              },
            },
          },
          cad_total: {
            $reduce: {
              input: '$carrier_quotes',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.currency', 'CAD'] },
                  {
                    $add: [
                      '$$value',
                      { $ifNull: ['$$this.carrier_bid.amount', 0] },
                    ],
                  },
                  '$$value',
                ],
              },
            },
          },
          total_weight_lb: {
            $reduce: {
              input: '$carrier_quotes',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $cond: [
                      { $eq: ['$$this.details.weight_unit', 'kg'] },
                      {
                        // Convert from kg to lb (1 kg = 2.20462 lb)
                        $multiply: [
                          { $ifNull: ['$$this.details.weight', 0] },
                          2.20462,
                        ],
                      },
                      {
                        // Keep weight as is if unit is already lb
                        $ifNull: ['$$this.details.weight', 0],
                      },
                    ],
                  },
                ],
              },
            },
          },
          total_weight_kg: {
            $reduce: {
              input: '$carrier_quotes',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $cond: [
                      { $eq: ['$$this.details.weight_unit', 'lb'] },
                      {
                        // Convert from lb to kg (1 lb = 0.453592 kg)
                        $multiply: [
                          { $ifNull: ['$$this.details.weight', 0] },
                          0.453592,
                        ],
                      },
                      {
                        // Keep weight as is if unit is already kg
                        $ifNull: ['$$this.details.weight', 0],
                      },
                    ],
                  },
                ],
              },
            },
          },
          total_miles_est: {
            $reduce: {
              input: '$carrier_quotes',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $ifNull: [{ $toDouble: '$$this.total_miles' }, 0], // Convert to number, default to 0 if null
                  },
                ],
              },
            },
          },
          number_of_loads: {
            $size: '$carrier_quotes',
          },
          on_time_pickups: {
            $sum: '$carrier_quotes.on_time_pickup',
          },
          on_time_drops: {
            $sum: '$carrier_quotes.on_time_drop',
          },
          total_pickups: {
            $sum: '$carrier_quotes.number_of_pickups',
          },
          total_drops: {
            $sum: '$carrier_quotes.number_of_drops',
          },
        },
      },
      {
        $addFields: {
          total_cwt: {
            $divide: ['$total_weight_lb', 100],
          },
          total_in_usd: {
            $sum: [
              '$usd_total',
              {
                $multiply: ['$cad_total', '$currency_daily.cad_to_usd'],
              },
              {
                $multiply: ['$mxn_total', '$currency_daily.mxn_to_usd'],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          cwt_per_usd: {
            $divide: ['$total_in_usd', '$total_cwt'],
          },
        },
      },
      {
        $match: {
          number_of_loads: { $gt: 0 }, // Remove carriers with number_of_loads = 0
        },
      },
      {
        $limit: 5,
      },
    ]);

    return carriers;
  }

  async calculateAnalyticsPerLane(
    user_id: string,
    params: PaginationWithFilters,
  ) {
    const _aggregate = [];

    if (params.startDate) {
      const startDate = new Date(params.startDate);
      startDate.setHours(0, 0, 0, 0);

      _aggregate.push({
        $match: {
          createdAt: {
            $gte: startDate,
          },
        },
      });
    }

    if (params.endDate) {
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 0);

      _aggregate.push({
        $match: {
          createdAt: {
            $lt: endDate,
          },
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
          ],
        },
      });
    }

    let sort: any = {
      total_in_usd: -1,
    };

    if (params?.sort) {
      sort = {
        [params.sort]: -1,
      };
    }

    return await this._quoteModel
      .aggregate([
        {
          $match: {
            $or: [{ user_id: user_id }, { referral_id: user_id }],
            status: QuoteStatusEnum.DELIVERED,
          },
        },
        {
          $addFields: {
            bid_id_obj: {
              $toObjectId: '$bid_id',
            },
            quote_id_str: {
              $toString: '$_id',
            },

            user_id_external: {
              $toObjectId: `${user_id}`,
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            as: 'quote_author',
            localField: 'user_id_external',
            foreignField: '_id',
          },
        },
        {
          $lookup: {
            from: 'shipments',
            as: 'details',
            localField: '_id',
            foreignField: 'quote_id',
          },
        },
        {
          $lookup: {
            as: 'carrier_bid',
            from: 'bids',
            foreignField: '_id',
            localField: 'bid_id_obj',
          },
        },
        {
          $lookup: {
            as: 'addresses',
            from: 'addresses',
            foreignField: 'quote_id',
            localField: '_id',
          },
        },
        ..._aggregate,
        {
          $addFields: {
            laneStart: {
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
            laneEnd: {
              $last: {
                $filter: {
                  input: '$addresses',
                  as: 'address',
                  cond: {
                    $and: [
                      { $eq: ['$$address.address_type', 'drop'] }, // Match address_type = 'pickup'
                      // { $eq: ['$$address.order', 1] }, // Match order = 1
                    ],
                  },
                },
              },
            },
            number_of_addresses: {
              $size: '$addresses',
            },
            number_of_pickups: {
              $size: {
                $filter: {
                  input: '$addresses',
                  as: 'address',
                  cond: {
                    $and: [{ $eq: ['$$address.address_type', 'pickup'] }],
                  },
                },
              },
            },
            number_of_drops: {
              $size: {
                $filter: {
                  input: '$addresses',
                  as: 'address',
                  cond: {
                    $and: [{ $eq: ['$$address.address_type', 'drop'] }],
                  },
                },
              },
            },
            on_time_pickup: {
              $size: {
                $filter: {
                  input: '$addresses',
                  as: 'address',
                  cond: {
                    $and: [
                      { $eq: ['$$address.arrival_status', 'on_time'] },
                      { $eq: ['$$address.address_type', 'pickup'] },
                    ],
                  },
                },
              },
            },
            on_time_drop: {
              $size: {
                $filter: {
                  input: '$addresses',
                  as: 'address',
                  cond: {
                    $and: [
                      { $eq: ['$$address.arrival_status', 'on_time'] },
                      { $eq: ['$$address.address_type', 'drop'] },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $addFields: {
            details: {
              $arrayElemAt: ['$details', 0],
            },
            carrier_bid: {
              $arrayElemAt: ['$carrier_bid', 0],
            },
          },
        },
        {
          $group: {
            _id: {
              laneStart: '$laneStart.address',
              shortLaneStart: '$laneStart.partial_address',
              laneEnd: '$laneEnd.address',
              shortLaneEnd: '$laneEnd.partial_address',
              companyStart: '$laneStart.company_name',
              companyEnd: '$laneEnd.company_name',
            },
            quotes: { $push: '$$ROOT' }, // Combine all quotes with the same laneStart and laneEnd
            usd_total: {
              $sum: {
                $cond: [
                  { $eq: ['$currency', CurrencyEnum.USD] }, // Directly referencing `currency` in the quote
                  '$carrier_bid.amount', // Assuming `amount` is the field for the total amount in USD
                  0,
                ],
              },
            },
            cad_total: {
              $sum: {
                $cond: [
                  { $eq: ['$currency', CurrencyEnum.CAD] }, // Directly referencing `currency` in the quote
                  '$carrier_bid.amount', // Assuming `amount` is the field for the total amount in USD
                  0,
                ],
              },
            },
            mxn_total: {
              $sum: {
                $cond: [
                  { $eq: ['$currency', CurrencyEnum.MXN] }, // Directly referencing `currency` in the quote
                  '$carrier_bid.amount', // Assuming `amount` is the field for the total amount in USD
                  0,
                ],
              },
            },
            on_time_pickups: {
              $sum: '$on_time_pickup',
            },
            on_time_drops: {
              $sum: '$on_time_drop',
            },
            total_pickups: {
              $sum: '$number_of_pickups',
            },
            total_drops: {
              $sum: '$number_of_drops',
            },
            total_addresses: {
              $sum: '$number_of_addresses',
            },
          },
        },
        {
          $addFields: {
            number_of_loads: {
              $size: '$quotes',
            },
            total_weight_lb: {
              $reduce: {
                input: '$quotes',
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    {
                      $cond: [
                        { $eq: ['$$this.details.weight_unit', 'kg'] },
                        {
                          $multiply: [
                            { $ifNull: ['$$this.details.weight', 0] },
                            2.20462,
                          ],
                        },
                        {
                          $ifNull: ['$$this.details.weight', 0],
                        },
                      ],
                    },
                  ],
                },
              },
            },
            total_weight_kg: {
              $reduce: {
                input: '$quotes',
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    {
                      $cond: [
                        { $eq: ['$$this.details.weight_unit', 'lb'] },
                        {
                          $multiply: [
                            { $ifNull: ['$$this.details.weight', 0] },
                            0.453592,
                          ],
                        },
                        {
                          $ifNull: ['$$this.details.weight', 0],
                        },
                      ],
                    },
                  ],
                },
              },
            },
            total_miles_est: {
              $reduce: {
                input: '$quotes',
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    { $ifNull: [{ $toDouble: '$$this.total_miles' }, 0] },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            currency_type: 'daily',
          },
        },
        {
          $lookup: {
            from: 'currencies',
            as: 'currency_daily',
            localField: 'currency_type',
            foreignField: 'type',
          },
        },
        {
          $addFields: {
            currency_daily: {
              $arrayElemAt: ['$currency_daily', 0],
            },
          },
        },
        {
          $addFields: {
            total_cwt: {
              $divide: ['$total_weight_lb', 100],
            },
            total_in_usd: {
              $sum: [
                '$usd_total',
                {
                  $multiply: ['$cad_total', '$currency_daily.cad_to_usd'],
                },
                {
                  $multiply: ['$mxn_total', '$currency_daily.mxn_to_usd'],
                },
              ],
            },
          },
        },
        {
          $addFields: {
            cwt_per_usd: {
              $divide: ['$total_in_usd', '$total_cwt'],
            },
          },
        },
        {
          $sort: sort,
        },
        {
          $limit: 5,
        },
      ])
      .exec();
  }
}
