import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({
  timestamps: true,
})
export class Subscription {
  _id: Types.ObjectId;

  @Prop()
  user_id: string;

  @Prop()
  free_trial_days: number;

  @Prop()
  payment_date: number;

  @Prop()
  subscription: string;

  @Prop()
  coupon: string;

  @Prop()
  subscription_monthly_price: number;

  @Prop()
  manager_user_id: string; // Who worked with client before purchase

  @Prop()
  payment_link: string;

  @Prop()
  stripe_account_link: string;

  @Prop()
  next_payment: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
