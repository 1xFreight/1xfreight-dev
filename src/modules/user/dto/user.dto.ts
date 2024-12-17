import { Exclude, Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  position: string;

  @Expose()
  _id: string;

  @Expose()
  name: string;

  @Expose()
  status: string;

  @Expose()
  phone: string;

  @Expose()
  billing_address: string;

  @Expose()
  billing_phone: string;

  @Expose()
  billing_email: string;

  @Expose()
  currency: string;

  @Expose()
  auto_pickup: string;

  @Expose()
  auto_delivery: string;

  @Expose()
  auto_commodity: string;

  @Expose()
  quote_type: string;

  @Expose()
  email: string;

  @Expose()
  role: string;

  @Expose()
  logo: string;

  @Expose()
  referral_id: string;

  @Expose()
  equipments: string[];

  @Exclude()
  password: string;
}
