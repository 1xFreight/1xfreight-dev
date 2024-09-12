import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user/entities/user.entity';

export type SpotGroupDocument = SpotGroup & Document;

@Schema({
  timestamps: true,
})
export class SpotGroup {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: User;

  @Prop({ required: true })
  name: string;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ type: [String], required: true })
  carriers: string[];
}

export const SpotGroupSchema = SchemaFactory.createForClass(SpotGroup);
