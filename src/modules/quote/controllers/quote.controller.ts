import { Body, Controller, Get, Query, Post, Res, Param } from '@nestjs/common';
import { Auth } from '../../auth/decorators/auth.decorator';
import { User } from '../../user/decorators/user.decorator';
import { QuoteService } from '../services/quote.service';
import { PaginationWithFilters } from '../../common/interfaces/pagination.interface';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRolesEnum } from '../../common/enums/roles.enum';
import { BidService } from '../../bid/bid.service';
import { AddressService } from '../../address/address.service';
import { QuoteCreateService } from '../services/quote-create.service';
import { QuoteEnum } from '../../common/enums/quote.enum';
import { UserController } from '../../user/controllers/user.controller';

@Controller('quote')
export class QuoteController {
  constructor(
    private readonly _quoteService: QuoteService,
    private readonly _quoteCreateService: QuoteCreateService,
    private readonly _bidService: BidService,
    private readonly _addressService: AddressService,
  ) {}

  @Auth()
  @Get('/')
  async myQuotes(@User() user, @Query() params: PaginationWithFilters) {
    return this._quoteService.getUserQuotes(user, params);
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
    if (body.type === QuoteEnum.FTL || body.type === QuoteEnum.LTL)
      return this._quoteCreateService.createQuoteFtlLtl(
        body,
        user._id,
        user.referral_id,
      );
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
    @Body() body: { quote_id: string; bid_id: string; missingData: Array<any> },
  ) {
    return !!(await this._quoteService.acceptQuote(
      body.quote_id,
      body.bid_id,
      body.missingData,
    ));
  }

  @Auth()
  @Post('/add_po/:quote_id')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async addPo(
    @User() user,
    @Body() body: Array<string>,
    @Param('quote_id') quote_id,
  ) {
    return this._quoteService.addPoToQuote(user._id, body, quote_id);
  }

  @Auth()
  @Post('/change_carrier/:quote_id')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async changeCarrier(@User() user, @Param('quote_id') quote_id) {
    return this._quoteService.changeCarrier(user._id, quote_id);
  }

  @Auth()
  @Post('/cancel/:quote_id')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async cancelLoad(@User() user, @Param('quote_id') quote_id) {
    return this._quoteService.cancelLoad(user._id, quote_id);
  }

  @Auth()
  @Post('/duplicate-load')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async duplicateLoad(@User() user, @Body() body) {
    return this._quoteCreateService.duplicateLoad(
      user._id,
      body,
      user?.referral_id,
    );
  }

  @Auth()
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
    UserRolesEnum.CARRIER,
  ])
  @Get('/quote-status/:quote_id')
  async getQuoteStatus(@User() user, @Param('quote_id') quote_id) {
    return this._quoteService.findQuoteStatus(user, quote_id);
  }

  @Auth()
  @Post('/template')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async saveTemplate(
    @User() user,
    @Body() body: { quote_id: string; name: string },
  ) {
    return await this._quoteCreateService.createTemplate(
      user._id,
      body.quote_id,
      body.name,
    );
  }
}
