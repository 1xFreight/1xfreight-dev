import { Expose } from 'class-transformer';

export class ExcelExportDto {
  @Expose()
  quote_id_short: string;

  @Expose()
  type: string;

  @Expose()
  status: string;

  @Expose()
  origin: string;

  @Expose()
  destination: string;

  @Expose()
  pickup: string;

  @Expose()
  delivery: string;

  @Expose()
  currency: string;

  @Expose()
  total_cost: number;

  @Expose()
  carrier: string;

  @Expose()
  deadline_date: string;

  @Expose()
  deadline_time: string;

  @Expose()
  createdAt: string;

  @Expose()
  hazard: string;

  @Expose()
  goods_value: string;

  @Expose()
  weight: string;

  @Expose()
  quantity: string;

  @Expose()
  commodity: string;

  @Expose()
  references: string;
}
