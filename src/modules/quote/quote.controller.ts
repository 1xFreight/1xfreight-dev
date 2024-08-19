import { Body, Controller, Get, Query, Post } from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { User } from '../user/decorators/user.decorator';
import { QuoteService } from './quote.service';

@Controller('quote')
export class QuoteController {
  constructor(private readonly _quoteService: QuoteService) {}
  @Get('/')
  async myQuotes(@User() user, @Query() params: { limit: number }) {
    console.log(params.limit);
    return this._quoteService.getUserQuotes(user._id, params.limit);
  }
  @Auth()
  @Post('/create')
  async createQuote(@User() user, @Body() body) {
    if (body.type === 'FTL')
      return this._quoteService.createQuoteFTL(body, user);
  }

  @Auth()
  @Get('/templates')
  async getTemplates(@User() user) {
    return this._quoteService.getUserTemplates(user._id);
  }
}
