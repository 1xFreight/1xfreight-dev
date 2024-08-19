import { User, UserSchema } from '../user/entities/user.entity';
import { Address, AddressSchema } from '../address/address.entity';
import { Equipment, EquipmentSchema } from '../user/entities/equipment.entity';
import { Bid, BidSchema } from '../bid/bid.entity';
import {
  QuoteSubscriber,
  QuoteSubscriberSchema,
} from '../quote/entities/quote-subscriber.entity';
import {
  QuoteReference,
  QuoteReferenceSchema,
} from '../quote/entities/quote-reference.entity';
import { Shipment, ShipmentSchema } from '../quote/entities/shipment.entity';
import { Quote, QuoteSchema } from '../quote/entities/quote.entity';
import { Template, TemplateSchema } from '../quote/entities/template.entity';

export default [
  {
    name: User.name,
    schema: UserSchema,
  },
  {
    name: Address.name,
    schema: AddressSchema,
  },
  {
    name: Equipment.name,
    schema: EquipmentSchema,
  },
  {
    name: Bid.name,
    schema: BidSchema,
  },
  {
    name: QuoteSubscriber.name,
    schema: QuoteSubscriberSchema,
  },
  {
    name: QuoteReference.name,
    schema: QuoteReferenceSchema,
  },
  {
    name: Shipment.name,
    schema: ShipmentSchema,
  },
  {
    name: Quote.name,
    schema: QuoteSchema,
  },
  {
    name: Template.name,
    schema: TemplateSchema,
  },
];
