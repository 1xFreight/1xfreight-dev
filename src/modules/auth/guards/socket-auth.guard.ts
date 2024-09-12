import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as cookie from 'cookie';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../auth.service';

@Injectable()
export class SocketAuthGuard implements CanActivate {
  constructor(
    private readonly _reflector: Reflector,
    private readonly _authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    if (!client.handshake.headers.cookie) {
      throw new WsException('Unauthorized');
    }

    const cookies = cookie.parse(client.handshake.headers.cookie);

    const { accessToken } = cookies;

    try {
      await this._authService.verifyToken(accessToken);

      return true;
    } catch (e) {
      throw new WsException('Unauthorized');
    }
  }
}
