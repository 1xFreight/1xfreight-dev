import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './user.entity';
import { Model } from 'mongoose';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  create() {
    return this.userModel.create({
      name: 'testUser1',
      email: 'testEmail1@xxx.xxx',
      role: 'test',
    });
  }

  async findOneByEmail(email: string) {
    return this.userModel.findOne({ email });
  }
}
