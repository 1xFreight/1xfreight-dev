import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Currency, CurrencySchema } from './currency.entity';
import { CurrencyService } from './currency.service';
import { HttpModule } from '@nestjs/axios';
import { CurrencyController } from './currency.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Currency.name,
        schema: CurrencySchema,
      },
    ]),
    HttpModule,
  ],
  providers: [CurrencyService],
  controllers: [CurrencyController],
})
export class CurrencyModule {}
