import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AddressService } from './address.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { User } from '../user/decorators/user.decorator';
import { Address } from './address.entity';

@Controller('/address')
export class AddressController {
  constructor(private readonly _addressService: AddressService) {}

  @Auth()
  @Post('/')
  async createUserLocation(@User() user, @Body() body: Partial<Address>) {
    return !!(await this._addressService.create({
      ...body,
      user_id: user._id,
    }));
  }

  @Auth()
  @Get('/')
  async getUserLocations(
    @User() user,
    @Query()
    params: {
      searchText: string;
      limit: number;
    },
  ) {
    return this._addressService.findByUser(
      user._id,
      params?.searchText,
      params?.limit,
    );
  }
}
