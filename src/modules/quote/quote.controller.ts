import { Body, Controller, Get, Query, Post, Param, Res } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { User } from '../user/decorators/user.decorator';
import { QuoteService } from './quote.service';
import { PaginationWithFilters } from '../common/interfaces/pagination.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRolesEnum } from '../common/enums/roles.enum';
import { BidService } from '../bid/bid.service';

@Controller('quote')
export class QuoteController {
  constructor(
    private readonly _quoteService: QuoteService,
    private readonly _bidService: BidService,
  ) {}

  @Auth()
  @Get('/')
  async myQuotes(@User() user, @Query() params: PaginationWithFilters) {
    return this._quoteService.getUserQuotes(user._id, params);
  }
  @Auth()
  @Get('/shipments')
  async shipments(@User() user, @Query() params: PaginationWithFilters) {
    return this._quoteService.getShipments(user._id, params);
  }

  @Auth()
  @Get('/shipments/export')
  async exportShipmentsToExcel(
    @User() user,
    @Query() params: PaginationWithFilters,
    @Res() res,
  ) {
    const excelBuffer = await this._quoteService.exportToExcel(
      res,
      user._id,
      params,
    );

    // Set headers and send the file
    res.setHeader('Content-Disposition', 'attachment; filename=export.xlsx');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(excelBuffer);
  }

  @Auth()
  @Get('/carrier')
  @Roles([UserRolesEnum.CARRIER])
  async carrierQuotes(@User() user, @Query() params: PaginationWithFilters) {
    return this._quoteService.getUserQuotes(user._id, params, user);
  }

  @Auth()
  @Get('/id/:quote_id')
  async getOneQuote(@User() user, @Param('quote_id') quote_id) {
    return this._quoteService.getOneQuoteCarrier(quote_id, user.email);
  }

  @Auth()
  @Post('/create')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async createQuote(@User() user, @Body() body) {
    if (body.type === 'FTL')
      return this._quoteService.createQuoteFTL(body, user);
  }

  @Auth()
  @Get('/templates')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async getTemplates(@User() user) {
    return this._quoteService.getUserTemplates(user._id);
  }

  @Auth()
  @Post('/delete-template')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async deleteTemplate(@User() user, @Body() body: { template_id: string }) {
    return !!(await this._quoteService.deleteTemplate(
      user._id,
      body.template_id,
    ));
  }

  @Auth()
  @Post('/decline/:quote_id')
  @Roles([UserRolesEnum.CARRIER])
  async declineQuoteByCarrier(@User() user, @Param('quote_id') quote_id) {
    try {
      this._bidService.declineBid(user._id, quote_id);
    } catch {}
    return this._quoteService.declineQuote(user.email, quote_id);
  }

  @Auth()
  @Post('/accept')
  async acceptQuote(
    @User() user,
    @Body() body: { quote_id: string; bid_id: string },
  ) {
    return !!(await this._quoteService.acceptQuote(body.quote_id, body.bid_id));
  }
}
