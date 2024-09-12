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
import { SpotGroup } from './entitites/spot-group.entity';
import { PaginationWithFilters } from '../common/interfaces/pagination.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRolesEnum } from '../common/enums/roles.enum';

@Controller('/carrier')
export class CarrierController {
  constructor(private readonly _carrierService: CarrierService) {}

  @Auth()
  @Get('/')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async getUserCarriers(@User() user, @Query() params: PaginationWithFilters) {
    return this._carrierService.getUserCarriers(user._id, params);
  }

  @Auth()
  @Get('/fmcsa')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async fmcsaImport(@Query() params: { mc: string; dot: string }) {
    return this._carrierService.fmcsaImport(params.mc, params.dot);
  }

  @Auth()
  @Post('/create')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
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
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async updateCarrierInfo(@User() user, @Body() body: Partial<Carrier>) {
    return await this._carrierService.updateCarrierInfo(user._id, body);
  }

  @Auth()
  @Get('/spot')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async getSpotGroup(@User() user, @Query() params: PaginationWithFilters) {
    return this._carrierService.getUserSpotGroup(user._id, params);
  }

  @Auth()
  @Post('/spot-create')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_DEMO,
    UserRolesEnum.SHIPPER_MEMBER,
  ])
  async createSpotGroup(@User() user, @Body() body: Partial<SpotGroup>) {
    return this._carrierService.createSpotGroup(
      user._id,
      body.name,
      body.carriers,
      body.status,
    );
  }
}
