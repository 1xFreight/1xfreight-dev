import { Controller, Get, Query } from '@nestjs/common';
import { CarrierService } from './carrier.service';
import { Auth } from '../auth/decorators/auth.decorator';

@Controller('/carrier')
export class CarrierController {
  constructor(private readonly _carrierService: CarrierService) {}

  // @Auth()
  @Get('/fmcsa')
  async fmcsaImport(@Query() params: { mc: string; dot: string }) {
    return this._carrierService.fmcsaImport(params.mc, params.dot);
  }
}
