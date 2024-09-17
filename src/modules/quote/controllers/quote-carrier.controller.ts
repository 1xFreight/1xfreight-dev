import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QuoteService } from '../services/quote.service';
import { BidService } from '../../bid/bid.service';
import { AddressService } from '../../address/address.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRolesEnum } from '../../common/enums/roles.enum';
import { User } from '../../user/decorators/user.decorator';
import { PaginationWithFilters } from '../../common/interfaces/pagination.interface';
import { QuoteCarrierService } from '../services/quote-carrier.service';

@Controller('quote')
export class QuoteCarrierController {
  constructor(
    private readonly _quoteService: QuoteService,
    private readonly _quoteCarrierService: QuoteCarrierService,
    private readonly _bidService: BidService,
    private readonly _addressService: AddressService,
  ) {}

  @Auth()
  @Get('/active-loads')
  @Roles([UserRolesEnum.CARRIER])
  async activeLoads(@User() user, @Query() params: PaginationWithFilters) {
    return this._quoteCarrierService.getCarrierActiveLoads(user._id, params);
  }

  @Auth()
  @Post('/update-status/:quote_id')
  @Roles([UserRolesEnum.CARRIER])
  async updateStatusByCarrier(
    @User() user,
    @Param('quote_id') quote_id,
    @Body()
    body: { arrival_time: string; arrival_date: string; address_id: string },
  ) {
    if (body && body.arrival_time && body.arrival_date && body.address_id) {
      await this._addressService.addArrivalTimeToAddress(
        body.arrival_date,
        body.arrival_time,
        body.address_id,
      );
    }

    return !!(await this._quoteCarrierService.changeQuoteStatusByCarrier(
      user._id,
      quote_id,
    ));
  }

  @Auth()
  @Get('/carrier')
  @Roles([UserRolesEnum.CARRIER])
  async carrierQuotes(@User() user, @Query() params: PaginationWithFilters) {
    return this._quoteService.getUserQuotes(user._id, params, user);
  }

  @Auth()
  @Get('/carrier/history')
  @Roles([UserRolesEnum.CARRIER])
  async carrierHistory(@User() user, @Query() params: PaginationWithFilters) {
    return this._quoteCarrierService.getCarrierHistory(user._id, params);
  }

  @Auth()
  @Get('/id/:quote_id')
  async getOneQuote(@User() user, @Param('quote_id') quote_id) {
    return this._quoteCarrierService.getOneQuoteCarrier(quote_id, user.email);
  }

  @Auth()
  @Post('/decline/:quote_id')
  @Roles([UserRolesEnum.CARRIER])
  async declineQuoteByCarrier(@User() user, @Param('quote_id') quote_id) {
    try {
      this._bidService.declineBid(user._id, quote_id);
    } catch {}
    return this._quoteCarrierService.declineQuote(user.email, quote_id);
  }
}
