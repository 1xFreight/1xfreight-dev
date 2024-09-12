import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class MessageDto {
  @Transform(({ value }) => value.trim())
  @MinLength(1, { message: 'Please input a message first!' })
  @MaxLength(500, { message: 'Message too long!' })
  @IsString()
  message: string;

  @IsString()
  room: string;

  @IsString()
  document: string;
}
