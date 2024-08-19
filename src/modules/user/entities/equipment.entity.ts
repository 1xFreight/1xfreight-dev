import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.entity';
import { EquipmentTypeEnum } from '../../common/enums/equipment-type.enum';

export type EquipmentDocument = Equipment & Document;

@Schema({
  timestamps: false,
})
export class Equipment {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: EquipmentTypeEnum })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: User;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);
