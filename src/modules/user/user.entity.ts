import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRolesEnum } from '../common/enums/roles.enum';
import { UserStatusEnum } from '../common/enums/user-status.enum';
import { CurrencyEnum } from '../common/enums/currency.enum';

export type UserDocument = User & Document;

@Schema({
  toJSON: {
    getters: true,
  },
  timestamps: true,
})
export class User {
  _id: Types.ObjectId;

  @Prop()
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({
    required: true,
    enum: UserRolesEnum,
    default: UserRolesEnum.SHIPPER_DEMO,
  })
  role: string;

  @Prop()
  password: string;

  @Prop()
  position: string;

  @Prop({ enum: UserStatusEnum, default: UserStatusEnum.INACTIVE })
  status: string;

  @Prop()
  phone: string;

  @Prop({ enum: CurrencyEnum, default: CurrencyEnum.USD })
  currency: string;

  @Prop({ name: 'referral_id' })
  referralId: string;

  @Prop({ default: false })
  autoPickup: boolean;

  @Prop({ default: false })
  autoDelivery: boolean;

  @Prop({ default: false })
  autoCommodity: boolean;

  @Prop({ name: 'default_comment' })
  defaultComment: string;

  @Prop()
  company: string;

  @Prop()
  quote_type: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
