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
  status: string;

  @Prop()
  mc: string;

  @Prop()
  dot: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user_id: User;
}

export const CarrierSchema = SchemaFactory.createForClass(Carrier);
