import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Carrier, CarrierDocument } from './carrier.entity';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import * as process from 'process';
import * as parser from 'xml2json';

@Injectable()
export class CarrierService {
  constructor(
    @InjectModel(Carrier.name)
    private readonly _carrierModel: Model<CarrierDocument>,
    private readonly httpService: HttpService,
  ) {}

  async create(carrier: Partial<Carrier>) {
    return (await this._carrierModel.create(carrier)).save();
  }

  async fmcsaImport(mc?: string, dot?: string) {
    const importData: any = {};
    const validateMc = (value: any) => {
      if (!value) return undefined;

      value.substring(0, 2).toUpperCase() === 'MC'
        ? value.toUpperCase()
        : 'MC' + value;
    };
    const mcPrefixed = validateMc(mc);

    let saferWatchRes = this.httpService.get(
      `${process.env.SAFERWATCH_LINK}${mcPrefixed ?? dot}&Action=CarrierLookup&ServiceKey=${process.env.SAFERWATCH_SERVICE_KEY}&CustomerKey=${process.env.SAFERWATCH_CUSTOMER_KEY}`,
    );

    let data = (await saferWatchRes.toPromise()).data;
    let json: any = parser.toJson(data, {
      coerce: false,
      object: true,
      trim: true,
    });

    if (
      json['CarrierService32.CarrierLookup']['ResponseDO'].action ===
        'FAILED' &&
      dot &&
      mc
    ) {
      saferWatchRes = this.httpService.get(
        `${process.env.SAFERWATCH_LINK}${dot}&Action=CarrierLookup&ServiceKey=${process.env.SAFERWATCH_SERVICE_KEY}&CustomerKey=${process.env.SAFERWATCH_CUSTOMER_KEY}`,
      );
      data = (await saferWatchRes.toPromise()).data;

      json = parser.toJson(data, {
        coerce: true,
        object: true,
        trim: true,
      });
    }

    if (json['CarrierService32.CarrierLookup']['ResponseDO'].action !== 'OK')
      return;

    const identity =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.Identity;

    const safety =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.Safety;

    const inspection =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.Inspection;

    const authority =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.Authority;

    const insurance =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.CertData
        ?.Certificate?.Coverage;

    const verifyType = (attr: any, type: string) => {
      return typeof attr === type ? attr : undefined;
    };

    if (identity) {
      importData['name'] = verifyType(identity.legalName, 'string')
        ? verifyType(identity.legalName, 'string')
        : verifyType(identity.dbaName, 'string');
      importData['address'] = verifyType(identity.businessStreet, 'string');
      importData['city'] = verifyType(identity.businessCity, 'string');
      importData['state'] = verifyType(identity.businessState, 'string');
      importData['zip'] = verifyType(identity.businessZipCode, 'string');
      importData['phone'] = verifyType(identity.cellPhone, 'string')
        ? verifyType(identity.cellPhone, 'string')
        : verifyType(identity.businessPhone, 'string');
      importData['email'] = verifyType(identity.emailAddress, 'string');

      importData.phone;
    }

    if (safety) {
      importData['safety_rating'] = verifyType(safety.rating, 'string');
    }

    if (inspection) {
      importData['total_us_inspect'] = Number(
        verifyType(inspection.inspectTotalUS, 'string'),
      );
      importData['total_can_inspect'] = Number(
        verifyType(inspection.inspectTotalCAN, 'string'),
      );
    }

    if (authority) {
      importData['authority'] = verifyType(authority.authGrantDate, 'string');
    }

    console.log(importData);
    console.log(insurance);
    // console.log(data);
  }
}
