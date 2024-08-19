import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Quote } from './quote.entity';

export type QuoteReferenceDocument = QuoteReference & Document;

@Schema({
  timestamps: false,
})
export class QuoteReference {
  _id: Types.ObjectId;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  number: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Quote' })
  quote_id: Quote;
}

export const QuoteReferenceSchema =
  SchemaFactory.createForClass(QuoteReference);
