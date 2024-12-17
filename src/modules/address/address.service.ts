import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Address, AddressDocument } from './address.entity';
import { Model, Types } from 'mongoose';
import { PaginationWithFilters } from '../common/interfaces/pagination.interface';
import { Client } from '@googlemaps/google-maps-services-js';
import { isDateValid } from '../common/utils/date.util';
import { AddressArrivalStatusEnum } from '../common/enums/address-type.enum';
import { ObjectId } from 'mongodb';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AddressService {
  private client: Client;
  private apiKey = 'AIzaSyB6vapMmYLVJwiWJ69oOGwfyQQ-U53qKWw';
  constructor(
    @InjectModel(Address.name)
    private readonly _addressModel: Model<AddressDocument>,
    private readonly _notificationsService: NotificationsService,
  ) {
    this.client = new Client({});
  }

  async create(address: Partial<Address>) {
    const _address = address;

    if (_address.state && _address.city && _address.country) {
      address['partial_address'] =
        `${_address.city}, ${_address.state === _address.city ? '' : _address.state + ', '}${_address.country}${_address.zipcode ? ', ' + _address.zipcode : ''}`;
    }

    address['address'] =
      `${_address.street ? _address.street + ', ' : ''}${_address.zipcode ? _address.zipcode + ', ' : ''}${_address.city ? _address.city + ', ' : ''}${_address.state ? _address.state + ', ' : ''}${_address.country}`;

    return (await this._addressModel.create(_address)).save();
  }

  async findByQuote(quote_id: string) {
    return this._addressModel
      .aggregate([
        {
          $match: { quote_id: new Types.ObjectId(quote_id) },
        },
        {
          $sort: { order: 1 },
        },
        {
          $group: {
            _id: '$address_type',
            addresses: {
              $push: {
                address: '$address',
                address_type: '$address_type',
                order: '$order',
              },
            },
          },
        },
        {
          $unwind: '$addresses',
        },
        {
          $replaceRoot: { newRoot: '$addresses' },
        },
      ])
      .exec();
  }

  async findById(id: string) {
    return await (
      await this._addressModel
        .aggregate([
          {
            $match: {
              _id: new ObjectId(id),
            },
          },
        ])
        .exec()
    )[0];
  }

  async findByUser(user_id: string, params: PaginationWithFilters) {
    const _aggregate: any = [
      {
        $match: {
          user_id: user_id,
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
    ];

    if (params?.searchText) {
      _aggregate.push({
        $match: {
          $or: [
            {
              address: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              notes: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
          ],
        },
      });
    }

    const totalAddresses =
      (await this._addressModel.aggregate(_aggregate).count('total').exec())[0]
        ?.total || 0;

    if (params?.skip && params?.skip != 0) {
      _aggregate.push({ $skip: Number(params.skip) });
    }

    if (params?.limit && params?.limit > 0) {
      _aggregate.push({ $limit: Number(params.limit) });
    }

    const address = await this._addressModel.aggregate(_aggregate).exec();

    return { totalAddresses, address };
  }

  async calcAddressesDistance(addresses: string[]) {
    let distance = 0;
    const kmToMilesCoefficient = 0.621371192;

    for (let i = 0; i < addresses.length - 1; i++) {
      try {
        const response = await this.client.distancematrix({
          params: {
            origins: [addresses[i]],
            destinations: [addresses[i + 1]],
            key: this.apiKey,
          },
        });

        const distanceData = response?.data?.rows[0]?.elements;

        if (distanceData) {
          distanceData.map((distanceMatrix) => {
            distance += distanceMatrix.distance.value;
          });
        }
      } catch (e) {
        console.log('DISTANCE MATRRIX ERROR');
        console.log(e);
      }
    }

    return Math.floor((distance / 1000) * kmToMilesCoefficient);
  }

  async addArrivalTimeToAddress(
    arrival_date: string,
    arrival_time: string,
    address_id: string,
  ) {
    let arrival_status = AddressArrivalStatusEnum.ON_TIME;
    const address = await this._addressModel
      .findOne({ _id: new ObjectId(address_id) })
      .exec();

    if (address.arrival_time) {
      return;
    }

    if (address.date) {
      const isDateOnTime = isDateValid(arrival_date, address.date);
      if (!isDateOnTime) {
        arrival_status = AddressArrivalStatusEnum.LATE;
      }
    }

    if (
      address.time_end &&
      arrival_status === AddressArrivalStatusEnum.ON_TIME
    ) {
      const addressDayInterval = address.time_end.split(' ')[1];
      const arrivalDayInterval = arrival_status.split(' ')[1];

      if (addressDayInterval !== arrivalDayInterval) {
        arrival_status = AddressArrivalStatusEnum.LATE;
      }

      const addressHours = Number(address.time_end.split(':')[0]);
      const arrivalHours = Number(arrival_time.split(':')[0]);

      if (arrivalHours > addressHours) {
        arrival_status = AddressArrivalStatusEnum.LATE;
      }

      const addressMinutes = Number(
        address.time_end.split(' ')[0].split(':')[1],
      );
      const arrivalMinutes = Number(arrival_time.split(' ')[0].split(':')[1]);

      if (arrivalMinutes > addressMinutes) {
        arrival_status = AddressArrivalStatusEnum.LATE;
      }
    }

    return await this._addressModel
      .updateOne(
        { _id: new ObjectId(address_id) },
        {
          arrival_date,
          arrival_time,
          arrival_status,
        },
      )
      .exec();
  }

  async addAddressesMandatoryData(quote_id: string, data: Array<any>) {
    const addresses = await this._addressModel
      .find({
        quote_id: new ObjectId(quote_id),
      })
      .lean()
      .exec();

    // Use `Promise.all` to ensure updates complete before function exits
    await Promise.all(
      addresses.map(async (address) => {
        const missingData = data.find(
          (addrData) => addrData._id == address._id,
        );

        if (missingData) {
          const newAddrData = {
            ...missingData,
            ...address,
            _id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            quote_id: undefined,
            order: undefined,
            __v: undefined,
          };

          newAddrData['partial_address'] =
            `${newAddrData.city}, ${newAddrData.state === newAddrData.city ? '' : newAddrData.state + ', '}${newAddrData.country}${newAddrData.zipcode ? ', ' + newAddrData.zipcode : ''}`;

          newAddrData['address'] =
            `${newAddrData.street ? newAddrData.street + ', ' : ''}${newAddrData.zipcode ? newAddrData.zipcode + ', ' : ''}${newAddrData.city ? newAddrData.city + ', ' : ''}${newAddrData.state ? newAddrData.state + ', ' : ''}${newAddrData.country}`;

          // Await the update operation and use `$set`
          await this._addressModel
            .updateOne({ _id: address._id }, { $set: newAddrData })
            .exec();
        }
      }),
    );
  }

  // This function is used to check if addresses contain
  // all needed data before user accept carrier quote
  async verifyQuoteAddressesContainMandatoryData(
    quote_id: string,
  ): Promise<boolean> {
    const addresses = await this._addressModel
      .find({
        quote_id: new ObjectId(quote_id),
      })
      .exec();

    if (!addresses || addresses.length === 0) return false;

    const mandatoryFields = [
      'street',
      'city',
      'state',
      'zipcode',
      'country',
      'company_name',
      'contact_name',
      'contact_phone',
      'open_hours',
    ];

    const hasMissingFields = addresses.some((address) =>
      mandatoryFields.some(
        (field) => !address[field] || address[field].trim() === '',
      ),
    );

    return !hasMissingFields;
  }

  async updateAddress(user_id: string, address: Partial<Address>) {
    const newAddrData = { ...address };

    newAddrData['partial_address'] =
      `${newAddrData.city}, ${newAddrData.state === newAddrData.city ? '' : newAddrData.state + ', '}${newAddrData.country}${newAddrData.zipcode ? ', ' + newAddrData.zipcode : ''}`;

    newAddrData['address'] =
      `${newAddrData.street ? newAddrData.street + ', ' : ''}${newAddrData.zipcode ? newAddrData.zipcode + ', ' : ''}${newAddrData.city ? newAddrData.city + ', ' : ''}${newAddrData.state ? newAddrData.state + ', ' : ''}${newAddrData.country}`;

    return this._addressModel.updateOne(
      { user_id, _id: address._id },
      newAddrData,
    );
  }
}
