import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Quote } from '../quote/entities/quote.entity';
import { User } from '../user/entities/user.entity';

export type BidDocument = Bid & Document;

@Schema({
  timestamps: true,
})
export class Bid {
  _id: Types.ObjectId;

  @Prop({ required: true })
  valid_until: string;

  @Prop({ required: true })
  total_miles: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  transitTime: number;

  @Prop({ type: Types.ObjectId, ref: 'Quote', required: true })
  quote_id: Quote;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: User;
}

export const BidSchema = SchemaFactory.createForClass(Bid);
