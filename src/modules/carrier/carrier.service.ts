import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Carrier, CarrierDocument } from './entitites/carrier.entity';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import * as process from 'process';
import * as parser from 'xml2json';
import { User, UserDocument } from '../user/entities/user.entity';
import { UserRolesEnum } from '../common/enums/roles.enum';
import { SpotGroup, SpotGroupDocument } from './entitites/spot-group.entity';
import { PaginationWithFilters } from '../common/interfaces/pagination.interface';

@Injectable()
export class CarrierService {
  constructor(
    @InjectModel(Carrier.name)
    private readonly _carrierModel: Model<CarrierDocument>,
    @InjectModel(User.name)
    private readonly _userModel: Model<UserDocument>,
    @InjectModel(SpotGroup.name)
    private readonly _spotGroupModel: Model<SpotGroupDocument>,
    private readonly httpService: HttpService,
  ) {}

  async getUserCarriers(user_id: string, params: PaginationWithFilters) {
    const _aggregate: any = [
      {
        $match: {
          user_id: user_id,
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
      {
        $lookup: {
          from: 'spotgroups',
          let: { carrierId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$$carrierId', '$carriers'] },
              },
            },
            {
              $project: { name: 1 },
            },
          ],
          as: 'matchingSpotGroups',
        },
      },
      {
        $addFields: {
          tags: {
            $reduce: {
              input: '$matchingSpotGroups',
              initialValue: [],
              in: { $setUnion: ['$$value', ['$$this.name']] },
            },
          },
        },
      },
      {
        $project: {
          matchingSpotGroups: 0,
        },
      },
    ];

    if (params?.searchText) {
      _aggregate.push({
        $match: {
          $or: [
            {
              name: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
            {
              email: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
          ],
        },
      });
    }

    const totalCarriers =
      (await this._carrierModel.aggregate(_aggregate).count('total').exec())[0]
        ?.total || 0;

    if (params?.skip && params?.skip != 0) {
      _aggregate.push({ $skip: Number(params.skip) });
    }

    if (params?.limit) {
      _aggregate.push({ $limit: Number(params.limit) });
    }

    const carriers = await this._carrierModel.aggregate(_aggregate).exec();

    return {
      totalCarriers,
      carriers,
    };
  }

  async updateCarrierInfo(user_id: string, carrier: Partial<Carrier>) {
    return this._carrierModel
      .updateOne({ user_id, _id: carrier._id }, carrier)
      .exec();
  }

  async create(carrier: Partial<Carrier>, user_id: string) {
    const isUserExisting = await this._userModel
      .exists({ email: carrier.email })
      .exec();

    if (!isUserExisting) {
      const newUser = {
        name: carrier.name,
        email: carrier.email,
        role: UserRolesEnum.CARRIER,
        phone: carrier.phone,
      };

      (await this._userModel.create(newUser)).save;
    }

    return (await this._carrierModel.create({ ...carrier, user_id })).save();
  }

  async fmcsaImport(mc?: string, dot?: string) {
    const importData: any = {};
    const validateMc = (value: any) => {
      if (!value) return undefined;

      return value.substring(0, 2).toUpperCase() === 'MC'
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
      return { response: 'no data about carrier' };

    const identity =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.Identity;

    const safety =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.Safety;

    const inspection =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.Inspection;

    const fleetSize =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.Equipment
        ?.fleetsize;

    const authority =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.Authority;

    const insurance =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.CertData
        ?.Certificate?.Coverage;

    const mcNumber =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.docketNumber;
    const dotNumber =
      json['CarrierService32.CarrierLookup'].CarrierDetails?.dotNumber?.$t;

    const removeObject = (attr: any) => {
      return typeof attr === 'string' ? attr : undefined;
    };

    importData['mc'] = removeObject(mcNumber);
    importData['dot'] = removeObject(dotNumber);
    importData['fleet_size'] = removeObject(fleetSize);

    if (identity) {
      importData['name'] = removeObject(identity.legalName)
        ? removeObject(identity.legalName)
        : removeObject(identity.dbaName);
      importData['address'] = removeObject(identity.businessStreet);
      importData['city'] = removeObject(identity.businessCity);
      importData['state'] = removeObject(identity.businessState);
      importData['zip'] = removeObject(identity.businessZipCode);
      importData['phone'] = removeObject(identity.cellPhone)
        ? removeObject(identity.cellPhone)
        : removeObject(identity.businessPhone);
      importData['email'] = removeObject(identity.emailAddress);

      importData.phone
        ? (importData.phone = importData.phone?.replaceAll('-', ''))
        : '';
    }

    if (safety) {
      importData['safety_rating'] = removeObject(safety.rating);
    }

    if (inspection) {
      importData['total_us_inspect'] = Number(inspection.inspectTotalUS);
      importData['total_can_inspect'] = Number(inspection.inspectTotalCAN);
    }

    if (authority) {
      importData['authority'] = removeObject(authority.authGrantDate);
    }

    if (insurance) {
      const getInsuranceType = (text: string) => {
        if (text.toLowerCase().includes('cargo')) return 'cargo';
        if (text.toLowerCase().includes('auto')) return 'auto';
        if (text.toLowerCase().includes('general')) return 'general';
      };

      insurance.map(({ type, expirationDate, coverageLimit }) => {
        const iType = getInsuranceType(type);
        importData[`insurance_${iType}`] = Number(
          coverageLimit.replaceAll(',', ''),
        );
        importData[`${iType}_expire`] = expirationDate;
      });
    }

    return importData;
  }

  async saferWatcherScraper() {
    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    Array(100)
      .fill(1)
      .map(async (x, index) => {
        const mc = `MC${getRandomInt(index, 999999)}`;
        const saferWatchRes = this.httpService.get(
          `${process.env.SAFERWATCH_LINK}${mc}&Action=CarrierLookup&ServiceKey=${process.env.SAFERWATCH_SERVICE_KEY}&CustomerKey=${process.env.SAFERWATCH_CUSTOMER_KEY}`,
        );

        let data = (await saferWatchRes.toPromise()).data;
        let json: any = parser.toJson(data, {
          coerce: false,
          object: true,
          trim: true,
        });

        if (
          json['CarrierService32.CarrierLookup']['ResponseDO'].action ===
          'FAILED'
        )
          return console.log('FAILED');

        if (
          json['CarrierService32.CarrierLookup']['ResponseDO'].action === 'OK'
        ) {
          const insurance =
            json['CarrierService32.CarrierLookup'].CarrierDetails?.CertData
              ?.Certificate?.Coverage;

          console.log(`INSURANCE DATA FOR MC${mc}`);
          console.log(insurance);
        }
      });
  }

  async createSpotGroup(
    user_id: string,
    name: string,
    carriers: string[],
    status: string,
  ) {
    return (
      await this._spotGroupModel.create({ user_id, name, carriers, status })
    ).save;
  }

  async getUserSpotGroup(user_id: string, params: PaginationWithFilters) {
    const _aggregate: any = [
      {
        $match: { user_id },
      },
      {
        $sort: { updatedAt: -1 },
      },
    ];

    if (params?.searchText) {
      _aggregate.push({
        $match: {
          $or: [
            {
              name: {
                $regex: params?.searchText,
                $options: 'i',
              },
            },
          ],
        },
      });
    }

    const totalSpot =
      (
        await this._spotGroupModel.aggregate(_aggregate).count('total').exec()
      )[0]?.total || 0;

    if (params?.skip && params?.skip != 0) {
      _aggregate.push({ $skip: Number(params.skip) });
    }

    if (params?.limit) {
      _aggregate.push({ $limit: Number(params.limit) });
    }

    const spots = await this._spotGroupModel.aggregate(_aggregate).exec();

    return {
      totalSpot,
      spots,
    };
  }
}
