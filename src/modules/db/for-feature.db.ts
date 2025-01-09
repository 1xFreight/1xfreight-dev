import { User, UserSchema } from '../user/entities/user.entity';
import { Address, AddressSchema } from '../address/address.entity';
import { Equipment, EquipmentSchema } from '../user/entities/equipment.entity';
import { Bid, BidSchema } from '../bid/bid.entity';
import { Shipment, ShipmentSchema } from '../quote/entities/shipment.entity';
import { Quote, QuoteSchema } from '../quote/entities/quote.entity';
import { Template, TemplateSchema } from '../quote/entities/template.entity';
import { Carrier, CarrierSchema } from '../carrier/entitites/carrier.entity';
import {
  SpotGroup,
  SpotGroupSchema,
} from '../carrier/entitites/spot-group.entity';
import { Item, ItemSchema } from '../quote/entities/item.entity';
import {
  Notification,
  NotificationSchema,
} from '../notifications/notification.entity';
import { Currency, CurrencySchema } from '../currency/currency.entity';
import {
  Subscription,
  SubscriptionSchema,
} from '../subscription/entity/subscription.entity';

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
  {
    name: Carrier.name,
    schema: CarrierSchema,
  },
  {
    name: SpotGroup.name,
    schema: SpotGroupSchema,
  },
  {
    name: Item.name,
    schema: ItemSchema,
  },
  {
    name: Notification.name,
    schema: NotificationSchema,
  },
  {
    name: Currency.name,
    schema: CurrencySchema,
  },
  {
    name: Subscription.name,
    schema: SubscriptionSchema,
  },
];
