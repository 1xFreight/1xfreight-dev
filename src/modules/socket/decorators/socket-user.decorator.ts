import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as cookie from 'cookie';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../user/entities/user.entity';

export const SocketUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext): Promise<User | null> => {
    const client = ctx.switchToWs().getClient();
    let user = null;

    if (!client.handshake.headers.cookie) return null;

    const cookies = cookie.parse(client.handshake.headers.cookie);

    const { accessToken } = cookies;

    try {
      user = new JwtService().decode(accessToken);
    } catch (e) {}

    return user;
  },
);
