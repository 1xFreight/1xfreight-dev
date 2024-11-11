import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { CurrencyEnum } from '../../common/enums/currency.enum';
import { Transform } from 'class-transformer';

export class UserUpdateDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.slice(0, 20))
  name: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.slice(0, 14))
  phone: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.slice(0, 20))
  position: string;

  @IsEnum(CurrencyEnum)
  @IsOptional()
  currency: string;

  @IsBoolean()
  @IsOptional()
  auto_pickup: boolean;

  @IsBoolean()
  @IsOptional()
  auto_delivery: boolean;

  @IsBoolean()
  @IsOptional()
  auto_commodity: boolean;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.slice(0, 256))
  default_comment: string;
}
