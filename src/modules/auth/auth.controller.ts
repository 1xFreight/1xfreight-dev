import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { MagicLoginStrategy } from './strategy/magiclogin.strategy';
import { PasswordLessLoginDto } from './dto/passwordless-login.dto';
import { AuthGuard } from '@nestjs/passport';
import { PasswordLoginDto } from './dto/password-login.dto';
import { cookieConfig } from '../common/config/cookie-config.const';
import { CreateUserDto } from './dto/create-user.dto';
import { Auth } from './decorators/auth.decorator';
import { User } from '../user/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly _authService: AuthService,
    private strategy: MagicLoginStrategy,
  ) {}

  @Post('/login')
  async login(@Req() req, @Res() res, @Body() body: PasswordLessLoginDto) {
    await this._authService.validateUser(body.destination);
    return this.strategy.send(req, res);
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

  @UseGuards(AuthGuard('magiclogin'))
  @Get('login/callback')
  callback(@Req() req) {
    return this._authService.generateTokens(req.user);
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
}
