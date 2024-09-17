import { Body, Controller, Get, Query, Post, Res } from '@nestjs/common';
import { Auth } from '../../auth/decorators/auth.decorator';
import { User } from '../../user/decorators/user.decorator';
import { QuoteService } from '../services/quote.service';
import { PaginationWithFilters } from '../../common/interfaces/pagination.interface';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRolesEnum } from '../../common/enums/roles.enum';
import { BidService } from '../../bid/bid.service';
import { AddressService } from '../../address/address.service';

@Controller('quote')
export class QuoteController {
  constructor(
    private readonly _quoteService: QuoteService,
    private readonly _bidService: BidService,
    private readonly _addressService: AddressService,
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
    res.setHeader('Content-Disposition', 'attachment; filename=export.xlsx');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(excelBuffer);
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
  @Post('/accept')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async acceptQuote(
    @User() user,
    @Body() body: { quote_id: string; bid_id: string },
  ) {
    return !!(await this._quoteService.acceptQuote(body.quote_id, body.bid_id));
  }
}
