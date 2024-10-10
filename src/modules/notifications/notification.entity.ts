import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({
  timestamps: true,
})
export class Notification {
  _id: Types.ObjectId;

  @Prop()
  user_id: string;

  @Prop()
  text: string;

  @Prop()
  button_name: string;

  @Prop()
  button_link: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
