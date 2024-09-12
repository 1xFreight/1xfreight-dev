import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.get(Roles, ctx.getHandler());
    if (!roles) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest();
    let user = null;

    const token = req?.rawHeaders
      ?.find((header) => header.includes('accessToken'))
      ?.replace('accessToken=', '');

    if (!token) return null;

    try {
      user = new JwtService().decode(token);
    } catch (e) {}

    return !!roles.includes(user?.role);
  }
}
