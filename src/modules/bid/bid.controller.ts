import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BidService } from './bid.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRolesEnum } from '../common/enums/roles.enum';
import { User } from '../user/decorators/user.decorator';
import { AddressService } from '../address/address.service';

@Controller('/bid')
export class BidController {
  constructor(
    private readonly _bidService: BidService,
    private readonly _addressService: AddressService,
  ) {}

  @Auth()
  @Roles([UserRolesEnum.CARRIER])
  @Post('/:quote_id')
  async addBid(@User() user, @Body() bid, @Param('quote_id') quote_id) {
    return !!(await this._bidService.create({
      user_id: user._id,
      ...bid,
      quote_id,
    }));
  }

  @Auth()
  @Roles([
    UserRolesEnum.CARRIER,
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_MEMBER,
    UserRolesEnum.SHIPPER_DEMO,
  ])
  @Get('/qid/:quote_id')
  async findOneBid(@User() user, @Param('quote_id') quote_id) {
    return (
      (await this._bidService.findOneByUserAndQuote(user._id, quote_id)) ?? {}
    );
  }

  @Auth()
  @Roles([UserRolesEnum.CARRIER])
  @Post('/qid/:quote_id')
  async updateBidPrice(
    @User() user,
    @Param('quote_id') quote_id,
    @Body() body: { amount: number },
  ) {
    return !!(await this._bidService.updateBidAmount(
      user._id,
      quote_id,
      body.amount,
    ));
  }
}
