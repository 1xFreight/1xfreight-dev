import { IsEmail, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UserMemberDto {
  @IsString()
  @Transform(({ value }) => value?.slice(0, 20))
  name: string;

  @IsString()
  @Transform(({ value }) => value?.slice(0, 12))
  phone: string;

  @IsString()
  @Transform(({ value }) => value?.slice(0, 20))
  position: string;

  @IsEmail()
  email: string;

  @IsString()
  status: string;
}
