import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CurrencyDocument = Currency & Document;

@Schema({
  timestamps: true,
})
export class Currency {
  _id: Types.ObjectId;

  @Prop()
  usd_to_cad: number;

  @Prop()
  usd_to_mxn: number;

  @Prop()
  cad_to_mxn: number;

  @Prop()
  cad_to_usd: number;

  @Prop()
  mxn_to_usd: number;

  @Prop()
  mxn_to_cad: number;

  @Prop({ unique: true })
  type: string;
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);
