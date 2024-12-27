import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../entities/user.entity';
import { Model } from 'mongoose';
import { UserStatusEnum } from '../../common/enums/user-status.enum';
import { UserRolesEnum } from '../../common/enums/roles.enum';

@Injectable()
export class UserAdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async saveUserAsDemo(user: Partial<User>) {
    return (
      await this.userModel.create({
        ...user,
        status: UserStatusEnum.INACTIVE,
        role: UserRolesEnum.SHIPPER_DEMO,
      })
    ).save();
  }

  async getWaitingDemoUsers() {
    return this.userModel
      .find({
        status: UserStatusEnum.INACTIVE,
        role: UserRolesEnum.SHIPPER_DEMO,
      })
      .exec();
  }

  async editUser(user_id: string, user: Partial<User>) {
    return this.userModel
      .findOneAndUpdate(
        {
          _id: user_id,
        },
        user,
      )
      .exec();
  }
}
