import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Quote, QuoteDocument } from '../quote/entities/quote.entity';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { UserRolesEnum } from '../common/enums/roles.enum';
import { Bid, BidDocument } from '../bid/bid.entity';
import { ObjectId } from 'mongodb';
import { EmailService } from './emailer.service';
import { AuthService } from '../auth/auth.service';
import * as process from 'process';
import { shortAddress } from '../common/utils/address.utils';
import { Carrier, CarrierDocument } from '../carrier/entitites/carrier.entity';
import { chatDateFormat } from '../common/utils/date.util';
import { formatBytes } from '../common/utils/file.utils';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Quote.name) private readonly _quoteModel: Model<QuoteDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Bid.name) private readonly _bidModel: Model<BidDocument>,
    @InjectModel(Carrier.name)
    private readonly _carrierModel: Model<CarrierDocument>,
    private readonly _emailService: EmailService,
    private readonly _authService: AuthService,
  ) {}

  async notifyNewMessage(room: string, message: any) {
    const ids = room.split(':');
    const quote_id = ids[0];
    const bid_id = ids[1];

    const quote = (
      await this._quoteModel
        .aggregate([
          {
            $match: {
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
            $lookup: {
              from: 'shipments',
              localField: '_id',
              foreignField: 'quote_id',
              as: 'details',
            },
          },
          {
            $addFields: {
              quote_id_str: { $toString: '$_id' },
              user_id_obj: { $toObjectId: '$user_id' },
              details: { $arrayElemAt: ['$details', 0] },
            },
          },
          {
            $addFields: {
              'details.goods_value': {
                $concat: [
                  { $toString: '$details.goods_value' },
                  ' ',
                  '$currency',
                ],
              },
              'details.weight': {
                $concat: [
                  { $toString: '$details.weight' },
                  ' ',
                  '$details.weight_unit',
                ],
              },

              deadline_date: {
                $concat: [
                  {
                    $dateToString: {
                      format: '%B %d, %Y', // Format: "Month Day, Year" (e.g., "September 25, 2024")
                      date: '$deadline_date',
                      timezone: 'UTC', // Adjust timezone as necessary
                    },
                  },
                  ' ',
                  '$deadline_time',
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
            $lookup: {
              from: 'users',
              localField: 'user_id_obj',
              foreignField: '_id',
              as: 'quote_author',
            },
          },
          {
            $limit: 1,
          },
          {
            $project: {
              type: 1,
              weight: 1,
              quote_type: 1,
              deadline_date: 1,
              total_miles: 1,
              load_number: 1,
              'addresses.address': 1,
              'addresses.address_type': 1,
              'addresses.order': 1,
              'addresses.shipping_hours': 1,
              'addresses.date': 1,
              'addresses.time_start': 1,
              'addresses.time_end': 1,
              'items.handling_unit': 1,
              'items.quantity': 1,
              'items.length': 1,
              'items.height': 1,
              'items.width': 1,
              'items.freight_class': 1,
              'items.weight': 1,
              'items.sub_class': 1,
              'items.nmfc': 1,
              'items.commodity': 1,
              'items.stackable': 1,
              'details.quantity': 1,
              'details.commodity': 1,
              'details.goods_value': 1,
              'details.weight': 1,
              'details.equipments': 1,
              quote_author: 1,
              subscribers: 1,
              equipments: 1,
            },
          },
        ])
        .exec()
    )[0];

    const teamMembers = (
      await this.userModel
        .aggregate([
          {
            $match: {
              email: {
                $in: quote.subscribers,
              },
              role: UserRolesEnum.SHIPPER_MEMBER,
            },
          },
        ])
        .exec()
    ).map(({ email }) => email);

    // const carrier = await this._bidModel.findOne({ _id: bid_id }).exec();
    const bid = await this._bidModel
      .aggregate([
        {
          $match: {
            _id: new ObjectId(bid_id),
          },
        },
        {
          $limit: 1,
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
            as: 'bid_author',
          },
        },
      ])
      .exec();

    const carrierEmail = bid[0].bid_author[0].email;
    const quoteAuthorEmail = quote.quote_author[0].email;
    const quoteAuthorUserId = quote.quote_author[0]._id;
    const messageAuthor = await this.userModel
      .findOne({ _id: message.user_id })
      .exec();
    let localCarrierName = null;

    const localCarrierData = await this._carrierModel
      .findOne({
        user_id: new ObjectId(quoteAuthorUserId),
        email: messageAuthor.email,
      })
      .exec();

    if (localCarrierData) {
      localCarrierName = localCarrierData.name;
    }

    // const roomSubscribedUsers = [
    //   ...teamMembers,
    //   carrierEmail,
    //   quoteAuthorEmail,
    // ].filter((email) => email != messageAuthorEmail);

    const quoteDetails = { ...quote.details, ...quote };
    const items = quote.items || [];
    const quoteAuthor = quote.quote_author[0];

    const pickup = quote.addresses.filter(
      ({ address_type }) => address_type === 'pickup',
    );

    const drop = quote.addresses.filter(
      ({ address_type }) => address_type === 'drop',
    );

    const pickupFirstAddress = pickup.filter(({ order }) => order == 1)[0];
    const dropLastAddress = drop.filter(({ order }) => order == drop.length)[0];

    const formattedPickupAddresses = pickup.map(
      ({ order, address, date, time_start, time_end, shipping_hours }) => {
        return {
          order,
          address: shortAddress(address),
          date,
          time_start,
          time_end,
          shipping_hours,
        };
      },
    );

    const formattedDropAddresses = drop.map(
      ({ order, address, date, time_start, time_end, shipping_hours }) => {
        return {
          order,
          address: shortAddress(address),
          date,
          time_start,
          time_end,
          shipping_hours,
        };
      },
    );

    const htmlQuoteDetails = {
      route: `from ${shortAddress(pickupFirstAddress.address)} to ${shortAddress(dropLastAddress.address)}`,
      id: quote_id
        .substring(quote_id.length - 7, quote_id.length)
        .toUpperCase(),
      type: quote.type,
      equipments: quote.equipments,
      pickup: formattedPickupAddresses,
      drop: formattedDropAddresses,
      commodity: quote.details.commodity,
      // viewUrl: viewQuoteLink,
      author: quoteAuthor.name,
      weight: quoteDetails.weight,
      // isHazard: true,
    };

    const html = this._emailService.generateQuoteEmailHTML(htmlQuoteDetails, {
      text: message.message.length ? message.message : message.documentName,
      author: localCarrierName ?? messageAuthor.name ?? messageAuthor.email,
      time: chatDateFormat(message.createdAt),
      documentSize: message.documentSize
        ? formatBytes(message.documentSize)
        : null,
      viewChat: 'test',
    });

    this._emailService.sendMail(
      `${localCarrierName ?? messageAuthor.name}`,
      'delertson@gmail.com',
      `New chat message about route: ${htmlQuoteDetails.route}`,
      '',
      // messageAuthor.email,
      'test@mibackwi3021ie90sajx89120yh31082o.store',
      html,
    );

    // if (roomSubscribedUsers) {
    //   const html = this._emailService.generateQuoteEmailHTML(htmlQuoteDetails, {
    //     text: message,
    //     author:
    //   });
    //
    //   roomSubscribedUsers.map((email) => {
    //     if (!email) return;
    //     this._emailService.sendMail(
    //       `${localCarrierName ?? messageAuthor.name ?? messageAuthor.email} <${messageAuthor.email}>`,
    //       'delertson@gmail.com',
    //       'New chat message',
    //       '',
    //       // messageAuthor.email,
    //       'test@mibackwi3021ie90sajx89120yh31082o.store',
    //       html,
    //     );
    //   });
    // }
  }

  async notifyNewQuote(quote_id: string) {
    const quote = (
      await this._quoteModel
        .aggregate([
          {
            $match: {
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
            $lookup: {
              from: 'shipments',
              localField: '_id',
              foreignField: 'quote_id',
              as: 'details',
            },
          },
          {
            $addFields: {
              quote_id_str: { $toString: '$_id' },
              user_id_obj: { $toObjectId: '$user_id' },
              details: { $arrayElemAt: ['$details', 0] },
            },
          },
          {
            $addFields: {
              'details.goods_value': {
                $concat: [
                  { $toString: '$details.goods_value' },
                  ' ',
                  '$currency',
                ],
              },
              'details.weight': {
                $concat: [
                  { $toString: '$details.weight' },
                  ' ',
                  '$details.weight_unit',
                ],
              },

              deadline_date: {
                $concat: [
                  {
                    $dateToString: {
                      format: '%B %d, %Y', // Format: "Month Day, Year" (e.g., "September 25, 2024")
                      date: '$deadline_date',
                      timezone: 'UTC', // Adjust timezone as necessary
                    },
                  },
                  ' ',
                  '$deadline_time',
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
            $lookup: {
              from: 'users',
              localField: 'user_id_obj',
              foreignField: '_id',
              as: 'quote_author',
            },
          },
          {
            $limit: 1,
          },
          {
            $project: {
              type: 1,
              weight: 1,
              quote_type: 1,
              deadline_date: 1,
              total_miles: 1,
              load_number: 1,
              'addresses.address': 1,
              'addresses.address_type': 1,
              'addresses.order': 1,
              'addresses.shipping_hours': 1,
              'addresses.date': 1,
              'addresses.time_start': 1,
              'addresses.time_end': 1,
              'items.handling_unit': 1,
              'items.quantity': 1,
              'items.length': 1,
              'items.height': 1,
              'items.width': 1,
              'items.freight_class': 1,
              'items.weight': 1,
              'items.sub_class': 1,
              'items.nmfc': 1,
              'items.commodity': 1,
              'items.stackable': 1,
              'details.quantity': 1,
              'details.commodity': 1,
              'details.goods_value': 1,
              'details.weight': 1,
              'details.equipments': 1,
              quote_author: 1,
              subscribers: 1,
              equipments: 1,
            },
          },
        ])
        .exec()
    )[0];

    const quoteDetails = { ...quote.details, ...quote };
    const addresses = quote.addresses || [];
    const items = quote.items || [];
    const quoteAuthor = quote.quote_author[0];

    const teamMembers = (
      await this.userModel
        .aggregate([
          {
            $match: {
              email: {
                $in: quote.subscribers,
              },
              role: UserRolesEnum.SHIPPER_MEMBER,
            },
          },
        ])
        .exec()
    ).map(({ email }) => email);

    const pickup = quote.addresses.filter(
      ({ address_type }) => address_type === 'pickup',
    );

    const drop = quote.addresses.filter(
      ({ address_type }) => address_type === 'drop',
    );

    const pickupFirstAddress = pickup.filter(({ order }) => order == 1)[0];
    const dropLastAddress = drop.filter(({ order }) => order == drop.length)[0];

    const formattedPickupAddresses = pickup.map(
      ({ order, address, date, time_start, time_end, shipping_hours }) => {
        return {
          order,
          address: shortAddress(address),
          date,
          time_start,
          time_end,
          shipping_hours,
        };
      },
    );

    const formattedDropAddresses = drop.map(
      ({ order, address, date, time_start, time_end, shipping_hours }) => {
        return {
          order,
          address: shortAddress(address),
          date,
          time_start,
          time_end,
          shipping_hours,
        };
      },
    );

    const url = process.env.URL;

    quote.subscribers.map(async (subscriberEmail, index) => {
      if (index >= 1) return; // REMOVE

      const subscriberUser = await this.userModel
        .findOne({ email: 'dredd1@test.com' ?? subscriberEmail })
        .exec();

      const accessToken = this._authService.generateTokens(
        subscriberUser,
        21600, // Access token will be valid 6h
      );
      const isUserTeamMember = teamMembers.includes(subscriberEmail);

      const viewQuoteLink = isUserTeamMember
        ? url + `/quotes/view/${quote_id}?token=${accessToken}`
        : url + `/available-quotes/${quote_id}?token=${accessToken}`;

      let declineUrl = null;

      if (!isUserTeamMember) {
        declineUrl =
          url + `/available-quotes/decline/${quote_id}?token=${accessToken}`;
      }

      const htmlQuoteDetails = {
        route: `from ${shortAddress(pickupFirstAddress.address)} to ${shortAddress(dropLastAddress.address)}`,
        id: quote_id
          .substring(quote_id.length - 7, quote_id.length)
          .toUpperCase(),
        type: quote.type,
        equipments: quote.equipments,
        pickup: formattedPickupAddresses,
        drop: formattedDropAddresses,
        commodity: quote.details.commodity,
        viewUrl: viewQuoteLink,
        declineUrl,
        author: quoteAuthor.name,
        weight: quoteDetails.weight,
        // isHazard: true,
      };

      const htmlNew =
        this._emailService.generateQuoteEmailHTML(htmlQuoteDetails);

      await this._emailService.sendMail(
        // `${quoteAuthor.name} <${quoteAuthor.email}>`,
        `${quoteAuthor.name}`,
        // subscriberEmail,
        'delertson@gmail.com',
        `New ${quote.type} Quote: ${shortAddress(pickupFirstAddress.address)} to ${shortAddress(dropLastAddress.address)} [${quote_id.substring(quote_id.length - 7, quote_id.length).toUpperCase()}]`,
        '',
        // quoteAuthor.email,
        'test@mibackwi3021ie90sajx89120yh31082o.store',
        htmlNew,
      );
    });
  }
}
