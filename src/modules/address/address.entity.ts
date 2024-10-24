import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AddressTypeEnum } from '../common/enums/address-type.enum';
import { Quote } from '../quote/entities/quote.entity';
import { User } from '../user/entities/user.entity';

export type AddressDocument = Address & Document;

@Schema({
  timestamps: true,
})
export class Address {
  _id: Types.ObjectId;

  @Prop({ required: true })
  address: string;

  @Prop()
  shipping_hours: string;

  @Prop()
  date: string;

  @Prop()
  time_start: string;

  @Prop()
  time_end: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user_id: User;

  @Prop()
  location_type: string;

  @Prop({ type: [String] })
  accessorials: string[];

  @Prop()
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'Quote' })
  quote_id: Quote;

  @Prop({ enum: AddressTypeEnum })
  address_type: string;

  @Prop({ default: 1 })
  order: number;

  @Prop()
  arrival_time: string;

  @Prop()
  arrival_date: string;

  @Prop()
  arrival_status: string;

  @Prop()
  street: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  zipcode: string;

  @Prop()
  country: string;

  @Prop()
  company_name: string;

  @Prop()
  contact_name: string;

  @Prop()
  contact_phone: string;

  @Prop()
  contact_email: string;

  @Prop()
  partial_address: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
