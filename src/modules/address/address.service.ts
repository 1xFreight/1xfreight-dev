import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Address, AddressDocument } from './address.entity';
import { Model, Types } from 'mongoose';
import { PaginationWithFilters } from '../common/interfaces/pagination.interface';
import { Client } from '@googlemaps/google-maps-services-js';

@Injectable()
export class AddressService {
  private client: Client;
  private apiKey = 'AIzaSyB6vapMmYLVJwiWJ69oOGwfyQQ-U53qKWw';
  constructor(
    @InjectModel(Address.name)
    private readonly _addressModel: Model<AddressDocument>,
  ) {
    this.client = new Client({});
  }

  async create(address: Partial<Address>) {
    return (await this._addressModel.create(address)).save();
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

  async findByUser(user_id: string, params: PaginationWithFilters) {
    const _aggregate: any = [
      {
        $match: {
          user_id: user_id,
        },
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
}
