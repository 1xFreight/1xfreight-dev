import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User as UserEntity } from '../user.entity';

export const User = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext): Promise<UserEntity> => {
    const req = ctx.switchToHttp().getRequest();
    let user = null;

    const token = req?.rawHeaders
      ?.find((header) => header.includes('accessToken'))
      ?.replace('accessToken=', '');

    if (!token) return null;

    try {
      user = new JwtService().decode(token);
    } catch (e) {}

    return user;
  },
);
