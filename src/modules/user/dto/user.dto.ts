import { Exclude, Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  userId: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  role: string;

  @Exclude()
  password: string;
}
