import { BadRequestException, Injectable } from '@nestjs/common';
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
import { ObjectId } from 'mongodb';
import { formatPhoneNumber } from '../common/utils/phone.utils';
import { Cron } from '@nestjs/schedule';

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

  async getUserCarriers(
    user_id: string,
    params: PaginationWithFilters,
    referral_id = null,
  ) {
    const _aggregate: any = [
      {
        $match: {
          user_id: referral_id ?? user_id,
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

    if (params?.status) {
      _aggregate.push({
        $match: {
          status: params.status,
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
      .updateOne({ user_id, _id: new ObjectId(carrier._id) }, carrier)
      .exec();
  }

  async create(carrier: Partial<Carrier>, user_id: string, referral_id = null) {
    const isCarrierExisting = await this._carrierModel
      .exists({ email: carrier.email, user_id: referral_id ?? user_id })
      .exec();

    const isUserExisting = await this._userModel
      .exists({ email: carrier.email })
      .exec();

    if (isCarrierExisting) {
      throw new BadRequestException(
        `Email ${carrier?.email} is already associated with a carrier`,
      );
    }

    if (!isUserExisting) {
      const newUser = {
        name: carrier.name,
        email: carrier.email,
        role: UserRolesEnum.CARRIER,
        phone: carrier.phone,
      };

      (
        await this._userModel.create({
          ...newUser,
        })
      ).save;
    }

    if (!isCarrierExisting) {
      (
        await this._carrierModel.create({
          ...carrier,
          user_id: referral_id ?? user_id,
        })
      ).save;

      if (carrier.mc || carrier.dot) {
        await this.addCarrierToWatchList(carrier.mc, carrier.dot);
      }
    }
  }

  async fmcsaImport(mc?: string, dot?: string) {
    this.updateCarrierSaferWatchData();

    const validateMc = (value: any) => {
      if (!value) return undefined;

      return value.substring(0, 2).toUpperCase() === 'MC'
        ? value.toUpperCase()
        : 'MC' + value;
    };
    const mcPrefixed = validateMc(mc);

    let saferWatchRes = this.httpService.get(
      `${process.env.SAFERWATCH_LINK}?number=${mcPrefixed ?? dot}&Action=CarrierLookup&ServiceKey=${process.env.SAFERWATCH_SERVICE_KEY}&CustomerKey=${process.env.SAFERWATCH_CUSTOMER_KEY}`,
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
        `${process.env.SAFERWATCH_LINK}?number=${dot}&Action=CarrierLookup&ServiceKey=${process.env.SAFERWATCH_SERVICE_KEY}&CustomerKey=${process.env.SAFERWATCH_CUSTOMER_KEY}`,
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

    return this.extractCarrierDataFromResponse(
      json['CarrierService32.CarrierLookup']['CarrierDetails'],
    );
  }

  async createSpotGroup(
    user_id: string,
    name: string,
    carriers: string[],
    status: string,
  ) {
    const carrierIdWithoutDuplicates = [...new Set(carriers)];

    await this._carrierModel.updateMany(
      {
        _id: { $in: carrierIdWithoutDuplicates },
      },
      { $set: { status: status } },
    );

    return (
      await this._spotGroupModel.create({
        user_id,
        name,
        carriers: carrierIdWithoutDuplicates,
        status,
      })
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
      {
        $addFields: {
          carriers: {
            $map: {
              input: '$carriers',
              as: 'carrierId',
              in: { $toObjectId: '$$carrierId' },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'carriers',
          localField: 'carriers',
          foreignField: '_id',
          as: 'local_carriers',
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

  async updateSpotGroup(user_id: string, spotGroupData: Partial<SpotGroup>) {
    const carrierIdWithoutDuplicates = [...new Set(spotGroupData.carriers)];

    await this._carrierModel.updateMany(
      {
        _id: { $in: carrierIdWithoutDuplicates },
        user_id,
      },
      { $set: { status: spotGroupData.status } },
    );

    return this._spotGroupModel.updateOne(
      {
        user_id,
        _id: spotGroupData._id,
      },
      { ...spotGroupData, carriers: carrierIdWithoutDuplicates },
    );
  }

  async deleteSpotGroup(user_id: string, _id: string) {
    return this._spotGroupModel.deleteOne({
      user_id,
      _id,
    });
  }

  @Cron('0 9 * * *')
  async updateCarrierSaferWatchData() {
    console.log('START CRON JOB UPDATE SAFER WATCH CARRIERS');
    const now = new Date();
    setTimeout(() => {}, 500);

    // Calculate today's date and time in GMT-6
    const gmtMinus6Today = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const dateGMTMinus6Today = gmtMinus6Today.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const timeGMTMinus6Today = gmtMinus6Today
      .toISOString()
      .split('T')[1]
      .split('.')[0]; // "HH:mm:ss"

    // Calculate yesterday's date and time in GMT-6
    const gmtMinus6Yesterday = new Date(
      gmtMinus6Today.getTime() - 24 * 60 * 60 * 1000,
    );
    const dateGMTMinus6Yesterday = gmtMinus6Yesterday
      .toISOString()
      .split('T')[0]; // "YYYY-MM-DD"
    const timeGMTMinus6Yesterday = gmtMinus6Yesterday
      .toISOString()
      .split('T')[1]
      .split('.')[0]; // "HH:mm:ss"

    const getSaferWatchUpdatedCarriers = () =>
      this.httpService.get(
        `${process.env.SAFERWATCH_LINK}?Action=GetChangedCarriers&ServiceKey=${process.env.SAFERWATCH_SERVICE_KEY}&CustomerKey=${process.env.SAFERWATCH_CUSTOMER_KEY}&fromDate=${dateGMTMinus6Yesterday}&fromTime=${timeGMTMinus6Yesterday}&toDate=${dateGMTMinus6Today}&toTime=${timeGMTMinus6Today}`,
      );

    const makeJsonFromResponse = async (response) => {
      const data = (await response.toPromise()).data;

      return parser.toJson(data, {
        coerce: true,
        object: true,
        trim: true,
      });
    };

    let json = await makeJsonFromResponse(getSaferWatchUpdatedCarriers());

    const isResponseOK = (responseObj) =>
      responseObj['CarrierService32.GetChangedCarriers']['ResponseDO'].action ==
      'OK';

    if (!isResponseOK(json)) {
      json = await makeJsonFromResponse(getSaferWatchUpdatedCarriers());
    }

    const carrierList =
      json['CarrierService32.GetChangedCarriers']['CarrierList'][
        'CarrierDetails'
      ];

    if (!isResponseOK(json) || !carrierList.length) {
      return false;
    }

    await Promise.all(
      carrierList.map(async (carrier) => {
        const carrierData = this.extractCarrierDataFromResponse(carrier);

        // Initialize an empty array for query conditions
        const conditions = [];

        // Add conditions only if the field exists in carrierData
        if (carrierData.mc) conditions.push({ mc: carrierData.dot });
        if (carrierData.dot) conditions.push({ mc: carrierData.dot });

        if (!conditions.length) return;

        await this._carrierModel.updateMany(
          {
            $or: conditions,
          },
          { $set: carrierData },
        );
      }),
    );
  }

  extractCarrierDataFromResponse(carrierDetails: any) {
    const removeObject = (attr: any) => {
      return typeof attr === 'string' ? attr : undefined;
    };

    const carrierData: any = {};

    const identity = carrierDetails?.Identity;
    const safety = carrierDetails.Safety;
    const inspection = carrierDetails.Inspection;
    const fleetSize = carrierDetails.Equipment?.fleetsize;
    const authority = carrierDetails.Authority;
    const insurance = carrierDetails.CertData?.Certificate?.Coverage;
    const mcNumber = carrierDetails.docketNumber;
    const dotNumber = carrierDetails.dotNumber?.$t;

    carrierData['mc'] = removeObject(mcNumber);
    carrierData['dot'] = removeObject(dotNumber);
    carrierData['fleet_size'] = removeObject(fleetSize);

    if (identity) {
      carrierData['name'] = removeObject(identity.legalName)
        ? removeObject(identity.legalName)
        : removeObject(identity.dbaName);
      carrierData['address'] = removeObject(identity.businessStreet);
      carrierData['city'] = removeObject(identity.businessCity);
      carrierData['state'] = removeObject(identity.businessState);
      carrierData['zip'] = removeObject(identity.businessZipCode);
      carrierData['phone'] = removeObject(identity.cellPhone)
        ? removeObject(identity.cellPhone)
        : removeObject(identity.businessPhone);
      carrierData['email'] = removeObject(identity.emailAddress);

      carrierData.phone
        ? (carrierData.phone = formatPhoneNumber(
            carrierData.phone?.replaceAll('-', ''),
          ))
        : '';
    }

    if (safety) {
      carrierData['safety_rating'] = removeObject(safety.rating);
    }

    if (inspection) {
      carrierData['total_us_inspect'] = Number(inspection.inspectTotalUS);
      carrierData['total_can_inspect'] = Number(inspection.inspectTotalCAN);
    }

    if (authority) {
      carrierData['authority'] = removeObject(authority.authGrantDate);
    }

    if (insurance && insurance.length) {
      const getInsuranceType = (text: string) => {
        if (text.toLowerCase().includes('cargo')) return 'cargo';
        if (text.toLowerCase().includes('auto')) return 'auto';
        if (text.toLowerCase().includes('general')) return 'general';
      };

      insurance.map(({ type, expirationDate, coverageLimit }) => {
        const iType = getInsuranceType(type);
        carrierData[`${iType}_expire`] = expirationDate;

        if (!coverageLimit) return;
        carrierData[`insurance_${iType}`] = Number(
          coverageLimit?.replaceAll(',', ''),
        );
      });
    }

    return carrierData;
  }

  async addCarrierToWatchList(mc: any, dot: any) {
    const validateMc = (value: any) => {
      if (!value) return null;

      return value.substring(0, 2).toUpperCase() === 'MC'
        ? value.toUpperCase()
        : 'MC' + value;
    };
    const mcPrefixed = validateMc(mc);

    const saferWatchResponse = this.httpService.get(
      `${process.env.SAFERWATCH_LINK}?number=${mcPrefixed ?? dot}&Action=AddWatch&ServiceKey=${process.env.SAFERWATCH_SERVICE_KEY}&CustomerKey=${process.env.SAFERWATCH_CUSTOMER_KEY}`,
    );

    let data = (await saferWatchResponse.toPromise()).data;
    let json: any = parser.toJson(data, {
      coerce: false,
      object: true,
      trim: true,
    });

    if (
      json['CarrierService32.AddWatch']['ResponseDO'].action !== 'OK' &&
      !mc
    ) {
      const saferWatchResponse = this.httpService.get(
        `${process.env.SAFERWATCH_LINK}?number=${dot}&Action=AddWatch&ServiceKey=${process.env.SAFERWATCH_SERVICE_KEY}&CustomerKey=${process.env.SAFERWATCH_CUSTOMER_KEY}`,
      );
    }
  }
}
