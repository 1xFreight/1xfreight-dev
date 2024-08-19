import { Exclude, Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  position: string;

  @Expose()
  name: string;

  @Expose()
  status: string;

  @Expose()
  phone: string;

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

  @Exclude()
  password: string;
}
