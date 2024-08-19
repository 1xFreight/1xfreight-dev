import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Quote } from './quote.entity';

export type TemplateDocument = Template & Document;

@Schema({
  timestamps: true,
})
export class Template {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Quote' })
  quote_id: Quote;

  @Prop({ required: true })
  user_id: string;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
