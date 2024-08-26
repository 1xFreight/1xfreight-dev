import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model } from 'mongoose';

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
    console.log(newUserData, user_id);
    return this.userModel
      .updateOne({ _id: newUserData._id, referral_id: user_id }, newUserData)
      .exec();
  }

  async findMembers(user_id: string) {
    return this.userModel.find({ referral_id: user_id }).exec();
  }
}
