import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/user.entity';
import * as process from 'process';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly _userService: UserService,
    private _jwtService: JwtService,
  ) {}

  generateTokens(user: User) {
    const payload = {
      sub: user._id,
      email: user.email,
    };

    return this._jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: 432000, // 5 days
    });
  }

  async validateUser(email: string) {
    const user = await this._userService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async createUser(email: string, password: string, role: string) {
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(password, salt);
    return await this._userService.create({
      email,
      role,
      password: hashPassword,
    });
  }

  async loginUser(email: string, password: string) {
    const user = await this._userService.findOneByEmail(email);

    if (user && user.password) {
      const match = await bcrypt.compare(password, user.password);
      if (match) return this.generateTokens(user);
    }
    return false;
  }
}
