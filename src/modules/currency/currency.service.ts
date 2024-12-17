import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Currency, CurrencyDocument } from './currency.entity';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import * as process from 'process';
import { CurrencyEnum } from '../common/enums/currency.enum';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectModel(Currency.name)
    private readonly _currencyModel = Model<CurrencyDocument>,
    private readonly httpService: HttpService,
  ) {}

  async getDailyCurrency() {
    const type = 'daily';
    return this._currencyModel.findOne({ type }).exec();
  }

  @Cron('0 9 15 * *')
  async updateDailyCurrencies() {
    console.log('Start cron job: Update currencies daily!');

    const usdCurrencyLink =
      process.env.CURRENCY_API + '&currencies=CAD%2CMXN&base_currency=USD';
    const cadCurrencyLink =
      process.env.CURRENCY_API + '&currencies=USD%2CMXN&base_currency=CAD';
    const mxnCurrencyLink =
      process.env.CURRENCY_API + '&currencies=CAD%2CUSD&base_currency=MXN';

    const currencyLinks = [
      { base: CurrencyEnum.USD, link: usdCurrencyLink },
      { base: CurrencyEnum.CAD, link: cadCurrencyLink },
      { base: CurrencyEnum.MXN, link: mxnCurrencyLink },
    ];

    let currencyDatabaseObject = { type: 'daily' };

    await Promise.all(
      currencyLinks.map(async ({ base, link }) => {
        const response = async () =>
          await this.httpService.get(link).toPromise();
        let data;

        try {
          data = (await response()).data.data;
        } catch (e) {
          data = (await response()).data.data;
        }

        switch (base) {
          case CurrencyEnum.CAD:
            currencyDatabaseObject['cad_to_usd'] = data[CurrencyEnum.USD];
            currencyDatabaseObject['cad_to_mxn'] = data[CurrencyEnum.MXN];
            break;
          case CurrencyEnum.USD:
            currencyDatabaseObject['usd_to_cad'] = data[CurrencyEnum.CAD];
            currencyDatabaseObject['usd_to_mxn'] = data[CurrencyEnum.MXN];
            break;
          case CurrencyEnum.MXN:
            currencyDatabaseObject['mxn_to_cad'] = data[CurrencyEnum.CAD];
            currencyDatabaseObject['mxn_to_usd'] = data[CurrencyEnum.USD];
            break;
        }
      }),
    );

    await this._currencyModel
      .updateOne(
        { type: 'daily' }, // Filter condition
        { $set: currencyDatabaseObject }, // Update operation
        { upsert: true }, // Enable upsert
      )
      .exec();
  }
}
