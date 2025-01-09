import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Quote, QuoteDocument } from '../entities/quote.entity';
import { Model } from 'mongoose';
import { Shipment, ShipmentDocument } from '../entities/shipment.entity';
import { Template, TemplateDocument } from '../entities/template.entity';
import { AddressService } from '../../address/address.service';
import { QuoteEnum } from '../../common/enums/quote.enum';
import { QuoteStatusEnum } from '../../common/enums/quote-status.enum';
import { Item, ItemDocument } from '../entities/item.entity';
import { ObjectId } from 'mongodb';
import { NotificationsService } from '../../notifications/notifications.service';
import { User, UserDocument } from '../../user/entities/user.entity';
import { UserStatusEnum } from '../../common/enums/user-status.enum';
import { Bid, BidDocument } from '../../bid/bid.entity';

@Injectable()
export class QuoteCreateService {
  constructor(
    @InjectModel(Quote.name) private readonly _quoteModel: Model<QuoteDocument>,
    @InjectModel(Shipment.name)
    private readonly _shipmentModel: Model<ShipmentDocument>,
    @InjectModel(Template.name)
    private readonly _templateModel: Model<TemplateDocument>,
    @InjectModel(Item.name)
    private readonly _itemModel: Model<ItemDocument>,
    private readonly _addressService: AddressService,
    private readonly _notificationService: NotificationsService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Bid.name) private readonly biModel: Model<BidDocument>,
  ) {}

  async createQuoteFtlLtl(quote: any, user_id: string, referral_id?: string) {
    const user = await this.userModel
      .findOne({
        _id: user_id,
      })
      .exec();

    if (user.status === UserStatusEnum.INACTIVE) {
      throw new BadRequestException(
        'User account is deactivated and cant create Quote!',
      );
    }

    const { pickup, drop, shipment_details, review, subscribers, equipments } =
      quote;

    const onlyAddress = [...pickup, ...drop].map(
      ({ city, state, country }) => city + ', ' + state + ', ' + country,
    );
    const total_miles =
      await this._addressService.calcAddressesDistance(onlyAddress);

    const quoteObj = {
      type: quote.type,
      status: QuoteStatusEnum.REQUESTED,
      user_id: user_id,
      quote_type: review.quote_type,
      currency: review.currency,
      deadline_date: review.deadline_date,
      deadline_time: review.deadline_time,
      subscribers,
      equipments,
      total_miles,
      load_number: shipment_details.load_number ?? 1,
    };

    if (referral_id) {
      quoteObj['referral_id'] = referral_id;
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
          user_id: user_id,
        })
      ).save;
    }

    if (quote.type === QuoteEnum.LTL && shipment_details.items) {
      shipment_details.items.map((item) =>
        this._itemModel.create({ ...item, quote_id }),
      );
    }

    this._notificationService.notifyNewQuote(quote_id.toString());
  }

  async createTemplate(user_id: string, quote_id: string, name: string) {
    return (
      await this._templateModel.create({
        user_id,
        quote_id: new ObjectId(quote_id),
        name,
      })
    ).save;
  }

  async duplicateLoad(user_id: string, payload: any, referral_id?: string) {
    const keepTheSameCarrier = payload?.keepTheSameCarrier ?? false;

    const originalQuote = await this._quoteModel
      .aggregate([
        {
          $match: {
            user_id: user_id.toString(),
            _id: new ObjectId(payload.quote_id),
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
          $addFields: {
            quote_id_str: { $toString: '$_id' },
            carrier_id_obj: { $toObjectId: '$carrier_id' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'carrier_id_obj',
            foreignField: '_id',
            as: 'carrier_user',
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
        {
          $limit: 1,
        },
      ])
      .exec();

    const originalAddresses = originalQuote[0].addresses;
    const newAddresses = originalAddresses.map((address) => {
      const updatedAddress = {
        ...address,
        date: undefined,
        time_start: undefined,
        time_end: undefined,
        arrival_time: undefined,
        arrival_date: undefined,
        arrival_status: undefined,
        _id: undefined,
      };

      const newAddressDateTime = payload.addresses.find(
        (newAddress) => address._id == newAddress.id,
      );

      if (newAddressDateTime) {
        Object.keys(newAddressDateTime).map((key) => {
          updatedAddress[key] = newAddressDateTime[key];
        });
      }

      return updatedAddress;
    });

    const newQuote = {
      ...originalQuote[0],
      addresses: undefined,
      items: undefined,
      details: undefined,
      deadline_date: payload.deadline_date,
      deadline_time: payload.deadline_time,
      _id: undefined,
      carrier_id: undefined,
      bid_id: undefined,
      subscribers: [
        ...originalQuote[0].subscribers,
        ...originalQuote[0].declined,
      ],
      declined: [],
      status: QuoteStatusEnum.REQUESTED,
      createdAt: undefined,
      updatedAt: undefined,
      referral_id,
    };

    if (keepTheSameCarrier) {
      newQuote.subscribers = [originalQuote[0].carrier_user[0]?.email];
    }

    const savedQuote = await (await this._quoteModel.create(newQuote)).save();
    const quote_id = savedQuote?._id;

    const details = await (
      await this._shipmentModel.create({
        ...originalQuote[0].details[0],
        quote_id: new ObjectId(quote_id),
        _id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      })
    ).save();

    await Promise.all(
      newAddresses.map(async (address) => {
        return this._addressService.create({ ...address, quote_id });
      }),
    );

    if (originalQuote[0].items?.length) {
      await Promise.all(
        originalQuote[0].items.map(
          async (item) =>
            await (
              await this._itemModel.create({
                ...item,
                quote_id,
                _id: undefined,
              })
            ).save(),
        ),
      );
    }

    await this._notificationService.notifyNewQuote(quote_id.toString());
  }
}
