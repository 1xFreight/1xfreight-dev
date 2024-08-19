import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Quote } from './quote.entity';
import { User } from '../../user/entities/user.entity';

export type QuoteSubscriberDocument = QuoteSubscriber & Document;

@Schema({
  timestamps: false,
})
export class QuoteSubscriber {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Quote' })
  quote_id: Quote;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user_id: User;
}

export const QuoteSubscriberSchema =
  SchemaFactory.createForClass(QuoteSubscriber);
