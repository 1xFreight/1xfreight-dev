import { Auth } from '../auth/decorators/auth.decorator';
import { Get, Query } from '@nestjs/common';
import { User } from '../user/decorators/user.decorator';

import { Controller } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PaginationWithFilters } from '../common/interfaces/pagination.interface';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly _analyticsService: AnalyticsService) {}

  @Auth()
  @Get('/')
  async getUserAnalytics(@User() user) {
    return this._analyticsService.userQuotesAnalytics(user._id);
  }

  @Auth()
  @Get('/carrier')
  async getCarrierAnalytics(
    @User() user,
    @Query() params: PaginationWithFilters,
  ) {
    return this._analyticsService.calculateAnalyticsPerCarrier(
      user._id,
      params,
    );
  }

  @Auth()
  @Get('/lanes')
  async getLanesAnalytics(
    @User() user,
    @Query() params: PaginationWithFilters,
  ) {
    console.log(params);
    return this._analyticsService.calculateAnalyticsPerLane(user._id, params);
  }
}
