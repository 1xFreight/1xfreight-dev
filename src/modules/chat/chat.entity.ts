import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../user/entities/user.entity';

export type ChatDocument = Chat & Document;

@Schema({
  timestamps: true,
})
export class Chat {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user_id: User;

  @Prop()
  message: string;

  @Prop({ required: true })
  room: string;

  @Prop()
  document: string;

  @Prop()
  documentName: string;

  @Prop()
  documentSize: number;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
