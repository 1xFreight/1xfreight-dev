import { IsEmail, IsString } from 'class-validator';

export class PasswordLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
