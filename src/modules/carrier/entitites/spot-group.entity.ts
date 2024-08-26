import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user/entities/user.entity';

export type SpotGroupDocument = SpotGroup & Document;

@Schema({
  timestamps: false,
})
export class SpotGroup {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: User;

  @Prop({ required: true })
  tag: string;
}
