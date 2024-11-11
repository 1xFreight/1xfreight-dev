import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRolesEnum } from '../../common/enums/roles.enum';
import { UserStatusEnum } from '../../common/enums/user-status.enum';
import { CurrencyEnum } from '../../common/enums/currency.enum';
import { Quote } from '../../quote/entities/quote.entity';
import { Address } from '../../address/address.entity';
import { QuoteTypeEnum } from '../../common/enums/quote-type.enum';

export type UserDocument = User & Document;

@Schema({
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

  @Prop({ type: Types.ObjectId, ref: 'User' })
  referral_id: User;

  @Prop({ default: false })
  auto_pickup: boolean;

  @Prop({ default: false })
  auto_delivery: boolean;

  @Prop({ default: false })
  auto_commodity: boolean;

  @Prop()
  default_comment: string;

  @Prop()
  company: string;

  @Prop()
  logo: string;

  @Prop({ type: [String] })
  equipments: string[];

  @Prop({ enum: QuoteTypeEnum, default: QuoteTypeEnum.QUOTE })
  quote_type: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Quote' }] })
  quotes: Quote[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Address' }] })
  saved_addresses: Address[];
}

export const UserSchema = SchemaFactory.createForClass(User);
