import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model } from 'mongoose';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(user: { email: string; password?: string; role?: string }) {
    return (await this.userModel.create(user)).save();
  }

  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async updateUserInfo(newUserData: Partial<User>, user_id: string) {
    return this.userModel.updateOne({ _id: user_id }, newUserData).exec();
  }
}
