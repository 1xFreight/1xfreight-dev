import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CarrierService } from './carrier.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { User } from '../user/decorators/user.decorator';

@Controller('/carrier')
export class CarrierController {
  constructor(private readonly _carrierService: CarrierService) {}

  @Auth()
  @Get('/')
  async getUserCarriers(@User() user) {
    return this._carrierService.getUserCarriers(user._id);
  }

  @Auth()
  @Get('/fmcsa')
  async fmcsaImport(@Query() params: { mc: string; dot: string }) {
    return this._carrierService.fmcsaImport(params.mc, params.dot);
  }

  @Get('/scraper-test')
  async scrap() {
    return this._carrierService.saferWatcherScraper();
  }

  @Auth()
  @Post('/create')
  async createCarrier(@User() user, @Body() body) {
    return !!(await this._carrierService.create(body, user._id));
  }
}
