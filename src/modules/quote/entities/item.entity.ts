import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ItemDocument = Item & Document;

@Schema()
export class Item {
  _id: Types.ObjectId;

  @Prop()
  handling_unit: string;

  @Prop()
  quantity: number;

  @Prop()
  length: number;

  @Prop()
  height: number;

  @Prop()
  width: number;

  @Prop()
  freight_class: number;

  @Prop()
  weight: number;

  @Prop()
  sub_class: string;

  @Prop()
  nmfc: string;

  @Prop()
  commodity: string;

  @Prop()
  quote_id: string;

  @Prop()
  stackable: boolean;

  @Prop()
  hazardous_material: boolean;

  @Prop()
  mixed_pallet: boolean;
}

export const ItemSchema = SchemaFactory.createForClass(Item);
