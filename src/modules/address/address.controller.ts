import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AddressService } from './address.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { User } from '../user/decorators/user.decorator';
import { Address } from './address.entity';
import { PaginationWithFilters } from '../common/interfaces/pagination.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRolesEnum } from '../common/enums/roles.enum';

@Controller('/address')
export class AddressController {
  constructor(private readonly _addressService: AddressService) {}

  @Auth()
  @Post('/')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async createUserLocation(@User() user, @Body() body: Partial<Address>) {
    return !!(await this._addressService.create({
      ...body,
      user_id: user._id,
    }));
  }

  @Auth()
  @Get('/')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async getUserLocations(
    @User() user,
    @Query()
    params: PaginationWithFilters,
  ) {
    return this._addressService.findByUser(user._id, params);
  }

  @Get('/test123')
  async testIt(@Query() body) {
    return this._addressService.verifyQuoteAddressesContainMandatoryData(
      body.quote_id,
    );
  }
}
