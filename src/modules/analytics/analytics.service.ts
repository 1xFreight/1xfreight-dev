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
    const startOfLastMonth = new Date();
    const endOfLastMonth = new Date();

    endOfLastMonth.setDate(1);
    endOfLastMonth.setMonth(startOfLastMonth.getMonth() + 1);
    endOfLastMonth.setHours(0, 0, 0, 0);
    startOfLastMonth.setDate(1);
    startOfLastMonth.setHours(0, 0, 0, 0);

    const lastMonthUserQuotes = await this._quoteModel
      .aggregate([
        {
          $match: {
            $or: [{ user_id: user_id }, { referral_id: user_id }],
            createdAt: {
              $gte: startOfLastMonth,
              $lt: endOfLastMonth,
            },
          },
        },
        {
          $addFields: {
            id_str1: { $toString: '$_id' },
            bid_id_obj: { $toObjectId: '$bid_id' },
          },
        },
        {
          $lookup: {
            from: 'bids',
            localField: 'bid_id_obj',
            foreignField: '_id',
            as: 'active_bid',
          },
        },
        {
          $addFields: {
            active_bid: { $arrayElemAt: ['$active_bid', 0] },
          },
        },
        {
          $project: {
            type: 1,
            status: 1,
            'bids.amount': 1,
            'active_bid.amount': 1,
            load_number: 1,
            currency: 1,
          },
        },
      ])
      .exec();

    const userQuotes = await this._quoteModel
      .aggregate([
        {
          $match: {
            $or: [{ user_id: user_id }, { referral_id: user_id }],
          },
        },
        {
          $addFields: {
            id_str1: { $toString: '$_id' },
            bid_id_obj: { $toObjectId: '$bid_id' },
          },
        },
        {
          $lookup: {
            from: 'bids',
            localField: 'id_str1',
            foreignField: 'quote_id',
            as: 'bids',
          },
        },
        {
          $lookup: {
            from: 'bids',
            localField: 'bid_id_obj',
            foreignField: '_id',
            as: 'active_bid',
          },
        },
        {
          $addFields: {
            active_bid: { $arrayElemAt: ['$active_bid', 0] },
          },
        },
        {
          $project: {
            type: 1,
            status: 1,
            'bids.amount': 1,
            'active_bid.amount': 1,
            load_number: 1,
            currency: 1,
          },
        },
      ])
      .exec();

    const userCarriersNumber =
      (
        await this._carrierModel
          .aggregate([
            {
              $match: {
                user_id: user_id,
              },
            },
          ])
          .count('total')
      )[0]?.total || 0;

    const userTeamMembersNumber =
      (
        await this._userModel
          .aggregate([
            {
              $match: {
                referral_id: user_id,
              },
            },
          ])
          .count('total')
      )[0]?.total || 0;

    const totalQuotes = userQuotes.length;
    const ltlQuotes = userQuotes.filter(
      ({ type }) => type === QuoteEnum.LTL,
    ).length;

    const ftlQuotes = userQuotes.filter(
      ({ type }) => type === QuoteEnum.FTL,
    ).length;

    const fclQuotes = userQuotes.filter(
      ({ type }) => type === QuoteEnum.FCL,
    ).length;

    const airQuotes = userQuotes.filter(
      ({ type }) => type === QuoteEnum.AIR,
    ).length;

    const totalQuotesDelivered = userQuotes.filter(
      ({ status }) => status === QuoteStatusEnum.DELIVERED,
    ).length;

    const shipments = userQuotes.filter(
      ({ status }) =>
        status !== QuoteStatusEnum.CANCELED &&
        status !== QuoteStatusEnum.REQUESTED,
    );

    let totalOffers = 0;

    shipments.map((quote) => {
      totalOffers += quote.bids.length;
    });

    const averageOffersPerQuote = Math.round(totalOffers / shipments.length);

    const totalQuotesCost = {
      [CurrencyEnum.USD]: 0,
      [CurrencyEnum.MXN]: 0,
      [CurrencyEnum.CAD]: 0,
    };

    shipments.map((quote) => {
      totalQuotesCost[quote.currency] +=
        (quote.load_number ?? 1) * quote.active_bid.amount;
    });

    const lastMonthQuotesCost = {
      [CurrencyEnum.USD]: 0,
      [CurrencyEnum.MXN]: 0,
      [CurrencyEnum.CAD]: 0,
    };

    const lastMonthShipments = lastMonthUserQuotes.filter(
      ({ status }) =>
        status !== QuoteStatusEnum.CANCELED &&
        status !== QuoteStatusEnum.REQUESTED,
    );

    lastMonthShipments.map((quote) => {
      lastMonthQuotesCost[quote.currency] +=
        (quote.load_number ?? 1) * quote.active_bid.amount;
    });

    return {
      totalQuotes,
      ltlQuotes,
      fclQuotes,
      ftlQuotes,
      airQuotes,
      // totalOffers,
      totalQuotesLastMonth: lastMonthUserQuotes.length,
      averageOffersPerQuote,
      totalQuotesDelivered,
      totalQuotesCost,
      lastMonthQuotesCost,
      totalActiveQuotes: shipments.length,
      userCarriersNumber,
      userTeamMembersNumber,
    };
  }

  async calculateAnalyticsPerCarrier(
    user_id: string,
    params: PaginationWithFilters,
  ) {
    const _aggreagte = [];

    if (params.startDate) {
      const startDate = new Date(params.startDate);
      startDate.setHours(0, 0, 0, 0);

      _aggreagte.push({
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

      _aggreagte.push({
        $match: {
          createdAt: {
            $lt: endDate,
          },
        },
      });
    }

    const userQuotes = await this._quoteModel
      .aggregate([
        {
          $match: {
            $or: [{ user_id: user_id }, { referral_id: user_id }],
          },
        },
        {
          $addFields: {
            id_str1: { $toString: '$_id' },
            bid_id_obj: { $toObjectId: '$bid_id' },
          },
        },
        {
          $lookup: {
            from: 'bids',
            localField: 'bid_id_obj',
            foreignField: '_id',
            as: 'active_bid',
          },
        },
        {
          $addFields: {
            active_bid: { $arrayElemAt: ['$active_bid', 0] },
          },
        },
        {
          $project: {
            type: 1,
            status: 1,
            'bids.amount': 1,
            'active_bid.amount': 1,
            load_number: 1,
            currency: 1,
          },
        },
        ..._aggreagte,
      ])
      .exec();

    return;
  }
}
