import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../user/entities/user.entity';

export type CarrierDocument = Carrier & Document;

@Schema({
  timestamps: true,
})
export class Carrier {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  zip: string;

  @Prop({ required: true })
  state: string;

  @Prop()
  safety_rating: string;

  @Prop()
  authority: string; // Authority granted on

  @Prop()
  total_us_inspect: number;

  @Prop()
  total_can_inspect: number; // Canadian

  @Prop()
  fleetSize: string;

  @Prop()
  insurance_general: string;

  @Prop()
  insurance_auto: string;

  @Prop()
  insurance_cargo: string;

  @Prop()
  mc: string;

  @Prop()
  dot: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user_id: User;
}

export const CarrierSchema = SchemaFactory.createForClass(Carrier);
