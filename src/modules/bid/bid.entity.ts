import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BidDocument = Bid & Document;

@Schema({
  timestamps: true,
})
export class Bid {
  _id: Types.ObjectId;

  @Prop({ required: true })
  valid_until: string;

  @Prop({ required: true })
  amount: number; // Amount per load

  @Prop({ required: true })
  transit_time: number;

  @Prop()
  notes: string;

  @Prop({ required: true })
  quote_id: string;

  @Prop({ required: true })
  user_id: string;
}

export const BidSchema = SchemaFactory.createForClass(Bid);
