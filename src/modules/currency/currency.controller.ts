import { Auth } from '../auth/decorators/auth.decorator';
import { Get } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { CurrencyService } from './currency.service';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly _currencyService: CurrencyService) {}

  @Auth()
  @Get('/daily')
  async getDailyCurrency() {
    return this._currencyService.getDailyCurrency();
  }
}
