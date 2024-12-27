import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../entities/user.entity';
import { Model } from 'mongoose';
import { PaginationWithFilters } from '../../common/interfaces/pagination.interface';
import { ObjectId } from 'mongodb';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(user: Partial<User>) {
    return (await this.userModel.create(user)).save();
  }

  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findOneById(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: id }).exec();
  }

  async updateUserInfo(newUserData: Partial<User>, user_id: string) {
    return this.userModel.updateOne({ _id: user_id }, newUserData).exec();
  }

  async updateMemberInfo(newUserData: Partial<User>, user_id: string) {
    return this.userModel
      .updateOne(
        {
          _id: new ObjectId(newUserData._id),
          referral_id: user_id,
        },
        newUserData,
      )
      .exec();
  }

  async findMembers(user_id: string, params?: PaginationWithFilters) {
    const _aggregate: any = [
      {
        $match: { referral_id: user_id },
      },
      {
        $project: {
          password: 0,
        },
      },
    ];

    if (params?.status) {
      _aggregate.push({
        $match: {
          status: params?.status,
        },
      });
    }

    if (params?.searchText) {
      _aggregate.push({
        $match: {
          $or: [
            {
              name: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              position: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              email: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              phone: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
          ],
        },
      });
    }

    const totalMembers =
      (await this.userModel.aggregate(_aggregate).count('total').exec())[0]
        ?.total || 0;

    if (params?.skip && params?.skip != 0) {
      _aggregate.push({ $skip: Number(params.skip) });
    }

    if (params?.limit) {
      _aggregate.push({ $limit: Number(params.limit) });
    }

    const members = await this.userModel.aggregate(_aggregate).exec();

    return {
      totalMembers,
      members,
    };
  }
}
