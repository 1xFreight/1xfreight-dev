import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-magic-login';
import { Injectable, Logger } from '@nestjs/common';
import * as process from 'process';
import { AuthService } from '../auth.service';

@Injectable()
export class MagicLoginStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(MagicLoginStrategy.name);
  constructor(private readonly _authService: AuthService) {
    super({
      secret: process.env.MAGIC_LOGIN_SECRET,
      jwtOptions: {
        expiresIn: '5m',
      },
      callbackUrl: process.env.URL + '/auth/login/callback',
      sendMagicLink: async (destination, href) => {
        // todo: send email
        this.logger.debug(
          `sending login email to ${destination} with link: ${href}`,
        );
      },
      verify: async (payload, callback) => {
        callback(null, this.validate(payload));
      },
    });
  }

  async validate(payload: { destination: string }) {
    return await this._authService.validateUser(payload.destination);
  }
}
