import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/entities/user.entity';
import * as process from 'process';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../notifications/emailer.service';
import { shortAddress } from '../common/utils/address.utils';

@Injectable()
export class AuthService {
  private usedTokens: Set<string> = new Set();
  private readonly MAX_TOKENS = 50000; // Max number of tokens to keep in memory
  private readonly CLEANUP_COUNT = 25000; // Number of tokens to remove during cleanup

  constructor(
    private readonly _userService: UserService,
    private _jwtService: JwtService,
    private _emailService: EmailService,
  ) {}

  async sendUserLoginEmail(userEmail: string) {
    const user = await this._userService.findOneByEmail(userEmail);
    const authToken = this.generateTokens(user, 7200); // expire in 2 hours
    const authLink = `${process.env.URL}/?token=${authToken}`;
    const htmlEmail = this._emailService.generateLoginEmail(authLink);

    await this._emailService.sendMail(
      `1xFreight <hello@1xfreight.com>`,
      userEmail,
      `Login to 1xFreight`,
      '',
      htmlEmail,
    );

    return true;
  }

  // Tokens default expire in 30 * 24 * 60 * 60 = 30 days
  generateTokens(user: User, expiresIn = 30 * 24 * 60 * 60) {
    const payload = {
      _id: user._id,
      email: user.email,
      role: user.role,
      referral_id: user?.referral_id ?? null,
    };

    return this._jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: expiresIn, // 5 days
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

    if (!user) {
      throw new BadRequestException(
        'No account was found associated with the provided email address. Please verify and try again.',
      );
    }

    if (user && user.password) {
      const match = await bcrypt.compare(password, user.password);
      if (match) return this.generateTokens(user);
      throw new BadRequestException(
        'The password entered is incorrect. Please verify your credentials and try again.',
      );
    }
    return false;
  }

  async changeUserPassword(user_id: string, newPassword: string) {
    const user = await this._userService.findOneById(user_id);

    if (user && user.password) {
      const match = await bcrypt.compare(newPassword, user.password);

      if (match) {
        throw new BadRequestException('Password cant be the same');
      }
    }

    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(newPassword, salt);

    return this._userService.updateUserInfo(
      { password: hashPassword },
      user_id,
    );
  }

  async verifyToken(token: string) {
    if (this.usedTokens.has(token)) {
      throw new BadRequestException('Token has already been used');
    }

    if (this._jwtService.verify(token, { secret: process.env.JWT_SECRET })) {
      this.cleanupTokensIfNecessary();
      return this._jwtService.decode(token);
    }

    return false;
  }

  markTokenAsUsed(token: string) {
    this.usedTokens.add(token);
    return true;
  }

  private cleanupTokensIfNecessary() {
    if (this.usedTokens.size > this.MAX_TOKENS) {
      // Remove the oldest tokens
      let count = 0;
      for (const token of this.usedTokens) {
        if (count >= this.CLEANUP_COUNT) break;
        this.usedTokens.delete(token);
        count++;
      }
    }
  }
}
