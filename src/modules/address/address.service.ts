import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Address, AddressDocument } from './address.entity';
import { Model } from 'mongoose';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name)
    private readonly _addressModel: Model<AddressDocument>,
  ) {}

  async create(address: Partial<Address>) {
    return (await this._addressModel.create(address)).save();
  }

  async findByQuote(quote_id: string) {
    return this._addressModel.find({ quote_id: quote_id }).exec();
  }

  async findByUser(user_id: string, searchText?: string, limit?: number) {
    const searchQuery: any = {
      user_id: user_id,
    };

    if (searchText) {
      searchQuery.address = { $regex: searchText, $options: 'i' };
    }

    let query = this._addressModel.find(searchQuery);

    if (limit) {
      query = query.limit(limit);
    }

    return query.exec();
  }
}
