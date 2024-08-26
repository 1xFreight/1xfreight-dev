import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { CarrierService } from './carrier.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { User } from '../user/decorators/user.decorator';
import { Carrier } from './entitites/carrier.entity';

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
    try {
      await this._carrierService.create(body, user._id);
    } catch (e) {
      if (e.code === 11000) {
        throw new BadRequestException(
          `Email ${body?.email} is already associated with a carrier`,
        );
      }
    }

    return true;
  }

  @Auth()
  @Post('/update')
  async updateCarrierInfo(@User() user, @Body() body: Partial<Carrier>) {
    return await this._carrierService.updateCarrierInfo(user._id, body);
  }
}
