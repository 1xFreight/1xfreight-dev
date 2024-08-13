import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import * as process from 'process';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private _authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([JwtStrategy.extractJWT]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  private static extractJWT(req): string | null {
    const token = req?.rawHeaders
      ?.find((header) => header.includes('accessToken'))
      ?.replace('accessToken=', '');

    if (token) return token;
    return null;
  }

  async validate(payload: { email: string }) {
    return await this._authService.validateUser(payload.email);
  }
}
