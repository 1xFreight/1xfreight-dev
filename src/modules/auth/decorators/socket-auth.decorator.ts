import { applyDecorators, UseGuards } from '@nestjs/common';
import { SocketAuthGuard } from '../guards/socket-auth.guard';

export function SocketAuth() {
  return applyDecorators(UseGuards(SocketAuthGuard));
}
