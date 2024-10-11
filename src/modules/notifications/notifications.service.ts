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
import { Notification, NotificationDocument } from './notification.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Quote.name) private readonly _quoteModel: Model<QuoteDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Bid.name) private readonly _bidModel: Model<BidDocument>,
    @InjectModel(Notification.name)
    private readonly _notificationModel: Model<NotificationDocument>,
    @InjectModel(Carrier.name)
    private readonly _carrierModel: Model<CarrierDocument>,
    private readonly _emailService: EmailService,
    private readonly _authService: AuthService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getUserNotifications(user_id: string) {
    return this._notificationModel.find({ user_id }).exec();
  }

  async clearAllUserNotifications(user_id: string) {
    return this._notificationModel.deleteMany({ user_id }).exec();
  }

  async clearOneUserNotification(user_id: string, notif_id: string) {
    return this._notificationModel
      .deleteOne({ user_id, _id: new ObjectId(notif_id) })
      .exec();
  }

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

    const teamMembers = await this.userModel
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
      .exec();

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

    const roomSubscribedUsers = [
      ...teamMembers,
      bid[0].bid_author[0],
      quote.quote_author[0],
    ].filter(({ email }) => email != messageAuthor.email);

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

    if (roomSubscribedUsers) {
      roomSubscribedUsers.map(async ({ email, _id }) => {
        if (!email) return;

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

        const html = this._emailService.generateQuoteEmailHTML(
          htmlQuoteDetails,
          {
            text: message.message.length
              ? message.message
              : message.documentName,
            author:
              localCarrierName ?? messageAuthor.name ?? messageAuthor.email,
            time: chatDateFormat(message.createdAt),
            documentSize: message.documentSize
              ? formatBytes(message.documentSize)
              : null,
            viewChat: 'test',
          },
        );

        this._emailService.sendMail(
          `${localCarrierName ?? messageAuthor.name} <hello@1xfreight.com>`,
          email,
          `New chat message about route: ${htmlQuoteDetails.route}`,
          '',
          html,
        );

        const notification = await this._notificationModel.create({
          user_id: _id,
          text: `New chat message about route: ${htmlQuoteDetails.route}`,
          button_name: 'view chat',
          button_link: 'find chat ',
        });

        this.eventEmitter.emit('new-notification', {
          room: _id,
          data: notification,
        });
      });
    }
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

    quote.subscribers.map(async (subscriberEmail) => {
      const subscriberUser = await this.userModel
        .findOne({ email: subscriberEmail })
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
        `${quoteAuthor.name} <hello@1xfreight.com>`,
        subscriberEmail,
        `New ${quote.type} Quote: ${shortAddress(pickupFirstAddress.address)} to ${shortAddress(dropLastAddress.address)} [${quote_id.substring(quote_id.length - 7, quote_id.length).toUpperCase()}]`,
        '',
        htmlNew,
      );
    });
  }

  async notifyStatusUpdate(
    quote_id: string,
    oldStatus: any,
    newStatus: any,
    carrierEmail: string,
    arrival = null,
  ) {
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

    const quoteAuthorUserId = quote.quote_author[0]._id;

    const localCarrierData = await this._carrierModel
      .findOne({
        user_id: new ObjectId(quoteAuthorUserId),
        email: carrierEmail,
      })
      .exec();

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

    const html = this._emailService.generateQuoteEmailHTML(
      htmlQuoteDetails,
      null,
      {
        oldStatus,
        newStatus,
        notificationTime: new Date(),
        arrival,
        carrierName: localCarrierData.name,
      },
    );

    this._emailService.sendMail(
      `${localCarrierData.name ?? '1xFreight'} <hello@1xfreight.com>`,
      quoteAuthor.email,
      `Quote Status Update: ${htmlQuoteDetails.route} [${quote_id
        .substring(quote_id.length - 7, quote_id.length)
        .toUpperCase()}]`,
      '',
      html,
    );

    const url = process.env.URL;

    const notification = await this._notificationModel.create({
      user_id: quoteAuthorUserId,
      text: `${localCarrierData.name} updated quote status to [${newStatus}] : ${shortAddress(pickupFirstAddress.address)} to ${shortAddress(dropLastAddress.address)}, [${quote_id.substring(quote_id.length - 7, quote_id.length).toUpperCase()}]`,
      button_name: 'view quote',
      button_link: `${url}/shipments/${quote_id}`,
    });

    this.eventEmitter.emit('new-notification', {
      room: quoteAuthorUserId,
      data: notification,
    });
  }

  async notifyCancelLoad(quote_id: string) {
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
              status: 1,
              bid_id: 1,
              carrier_id: 1,
            },
          },
        ])
        .exec()
    )[0];

    const quoteDetails = { ...quote.details, ...quote };
    const addresses = quote.addresses || [];
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

    // If quote have already chosen carrier then we notify only carrier ,
    // if quote awaiting quotes from carriers then we notify all subscribers users

    let notifyUsersList = [...quote.subscribers];

    if (quote.bid_id && quote.carrier_id) {
      const carrier = await this.userModel
        .findOne({ _id: new ObjectId(quote.carrier_id) })
        .exec();

      notifyUsersList = [carrier.email];
    }

    notifyUsersList.map(async (subscriberEmail, index) => {
      const subscriberUser = await this.userModel
        .findOne({ email: subscriberEmail })
        .exec();

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
        author: quoteAuthor.name,
        weight: quoteDetails.weight,
        status: quote.status,
      };

      const htmlNew =
        this._emailService.generateQuoteEmailHTML(htmlQuoteDetails);

      await this._emailService.sendMail(
        // `${quoteAuthor.name} <${quoteAuthor.email}>`,
        `${quoteAuthor.name} <hello@1xFreight.com>`,
        subscriberEmail,
        `Shipment canceled: ${shortAddress(pickupFirstAddress.address)} to ${shortAddress(dropLastAddress.address)} [${quote_id.substring(quote_id.length - 7, quote_id.length).toUpperCase()}]`,
        '',
        htmlNew,
      );

      const notification = await this._notificationModel.create({
        user_id: subscriberUser._id,
        text: `Shipment was canceled: ${shortAddress(pickupFirstAddress.address)} to ${shortAddress(dropLastAddress.address)}, [${quote_id.substring(quote_id.length - 7, quote_id.length).toUpperCase()}]`,
      });

      this.eventEmitter.emit('new-notification', {
        room: subscriberUser._id,
        data: notification,
      });
    });
  }
}
