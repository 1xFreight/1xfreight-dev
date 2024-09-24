import { Auth } from '../auth/decorators/auth.decorator';
import { Get } from '@nestjs/common';
import { User } from '../user/decorators/user.decorator';

import { Controller } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly _analyticsService: AnalyticsService) {}

  @Auth()
  @Get('/')
  async getUserAnalytics(@User() user) {
    // this._analyticsService.calculateAnalyticsPerCarrier(user._id);
    return this._analyticsService.userQuotesAnalytics(user._id);
  }
}
