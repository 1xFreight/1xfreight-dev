import { CurrencyEnum } from '../enums/currency.enum';

export function currencyStringToSymbol(currency: string) {
  switch (currency as CurrencyEnum) {
    case CurrencyEnum.CAD:
      return 'C$';
    case CurrencyEnum.MXN:
      return 'MX$';
    case CurrencyEnum.USD:
      return '$';
  }
}
