import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/user.entity';
import * as process from 'process';

@Injectable()
export class AuthService {
  constructor(
    private readonly _userService: UserService,
    private _jwtService: JwtService,
  ) {}

  generateTokens(user: User) {
    console.log(user);
    const payload = {
      sub: user.userId,
      email: user.email,
    };

    return {
      access_token: this._jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
      }),
    };
  }

  async validateUser(email: string) {
    const user = await this._userService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
