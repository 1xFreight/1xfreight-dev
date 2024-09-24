import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PackingMethodEnum } from '../../common/enums/packing-method.enum';
import { WeightUnitEnum } from '../../common/enums/weight-unit.enum';
import { Quote } from './quote.entity';

export type ShipmentDocument = Shipment & Document;

@Schema({
  timestamps: true,
})
export class Shipment {
  _id: Types.ObjectId;

  @Prop({ required: false, enum: PackingMethodEnum })
  packing_method: string;

  @Prop()
  quantity: string;

  @Prop()
  overweight: boolean;

  @Prop()
  commodity: string;

  @Prop()
  goods_value: number;

  @Prop()
  hazardous_goods: boolean;

  @Prop()
  un_number: string;

  @Prop()
  hazard_clss: string;

  @Prop()
  emergency_contact: string;

  @Prop()
  emergency_phone1: string;

  @Prop()
  emergency_phone2: string;

  @Prop()
  packing_type: string;

  @Prop({ type: [String] })
  equipment: string[];

  @Prop()
  weight: number;

  @Prop({ required: false, enum: WeightUnitEnum })
  weight_unit: string;

  @Prop({ type: [String] })
  accessorials: string[];

  @Prop()
  max_temp: number;

  @Prop()
  min_temp: number;

  @Prop()
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'Quote' })
  quote_id: Quote;

  @Prop()
  density: number;

  @Prop()
  volume: number;

  @Prop()
  skid_spots: number;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);
