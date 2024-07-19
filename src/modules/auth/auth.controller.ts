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

  @UseGuards(AuthGuard('magiclogin'))
  @Get('login/callback')
  callback(@Req() req) {
    return this._authService.generateTokens(req.user);
  }
}
