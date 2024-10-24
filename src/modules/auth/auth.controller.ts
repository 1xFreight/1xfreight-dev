import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordLoginDto } from './dto/password-login.dto';
import { cookieConfig } from '../common/config/cookie-config.const';
import { CreateUserDto } from './dto/create-user.dto';
import { Auth } from './decorators/auth.decorator';
import { User } from '../user/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  @Post('/login-email')
  async loginEmail(
    @Req() req,
    @Res({ passthrough: true }) res,
    @Body() body: { email: string },
  ) {
    await this._authService.validateUser(body.email);
    return await this._authService.sendUserLoginEmail(body.email);
  }

  @Post('/login-pass')
  async loginPass(
    @Req() req,
    @Res({ passthrough: true }) res,
    @Body() body: PasswordLoginDto,
  ) {
    const token = await this._authService.loginUser(body.email, body.password);

    if (!token) return 'Invalid credentials';

    res.cookie('accessToken', token, cookieConfig);
    return true;
  }

  @Post('/create-user')
  async createNewUser(
    @Res({ passthrough: true }) res,
    @Body() body: CreateUserDto,
  ) {
    try {
      await this._authService.createUser(body.email, body.password, body.role);
      return true;
    } catch (e) {
      return e.errmsg;
    }
  }

  @Auth()
  @Post('/logout')
  logout(@Res({ passthrough: true }) res) {
    res.clearCookie('accessToken');
    return true;
  }

  @Auth()
  @Post('/change-password')
  async changeUserPassword(@User() user, @Body() body) {
    return !!(await this._authService.changeUserPassword(
      user._id,
      body?.password,
    ));
  }

  @Post('/use-token')
  async useToken(
    @Body() body: { accessToken: string },
    @Res({ passthrough: true }) res,
  ) {
    let isTokenValid;

    try {
      isTokenValid = await this._authService.verifyToken(body.accessToken); // it return user from token if valid
    } catch (e) {
      throw new BadRequestException('Expired or invalid auth token');
    }

    if (isTokenValid) {
      const newToken = await this._authService.generateTokens(isTokenValid);
      res.cookie('accessToken', newToken, cookieConfig);
      this._authService.markTokenAsUsed(body.accessToken);
      return true;
    }

    return false;
  }
}
