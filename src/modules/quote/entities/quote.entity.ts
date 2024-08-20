import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { QuoteEnum } from '../../common/enums/quote.enum';
import { QuoteStatusEnum } from '../../common/enums/quote-status.enum';
import { CurrencyEnum } from '../../common/enums/currency.enum';
import { QuotePreferencesEnum } from '../../common/enums/quote-preferences.enum';
import { User } from '../../user/entities/user.entity';
import { Address } from '../../address/address.entity';
import { Bid } from '../../bid/bid.entity';
import { Shipment } from './shipment.entity';

export type QuoteDocument = Quote & Document;

@Schema({
  timestamps: true,
})
export class Quote {
  _id: Types.ObjectId;

  @Prop({ required: true, enum: QuoteEnum, default: QuoteEnum.FTL })
  type: string;

  @Prop({ required: true })
  quote_type: string;

  @Prop({
    required: true,
    enum: QuoteStatusEnum,
    default: QuoteStatusEnum.REQUESTED,
  })
  status: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user_id: User;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  referral_id: User;

  @Prop({ required: true, enum: CurrencyEnum, default: CurrencyEnum.USD })
  currency: string;

  @Prop({ required: true })
  deadline_date: Date;

  @Prop({ required: true })
  deadline_time: string;

  @Prop({ type: Types.ObjectId, ref: 'Bid' })
  bid_id: Bid;

  @Prop({ required: false, enum: QuotePreferencesEnum })
  preference: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Address' }] })
  addresses: Address[];

  @Prop({ type: Types.ObjectId, ref: 'Shipment' })
  details: Shipment;

  @Prop({ type: [String] })
  references: string[];
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);
