import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { Auth } from './modules/auth/decorators/auth.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Auth()
  @Get('protected')
  getPro(@Req() req) {
    return req.user;
  }
}
