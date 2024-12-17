import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import * as process from 'process';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { QuoteModule } from './modules/quote/quote.module';
import { AddressModule } from './modules/address/address.module';
import { CarrierModule } from './modules/carrier/carrier.module';
import { FileSystemModule } from './modules/files/file.module';
import { MulterModule } from '@nestjs/platform-express';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { SocketModule } from './modules/socket/socket.module';
import { ChatModule } from './modules/chat/chat.module';
import { BidModule } from './modules/bid/bid.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CurrencyModule } from './modules/currency/currency.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_CONNECTION_STRING),
    UserModule,
    AuthModule,
    QuoteModule,
    AddressModule,
    CarrierModule,
    FileSystemModule,
    MulterModule.register({
      dest: './uploads',
    }),
    SocketModule,
    ChatModule,
    BidModule,
    EventEmitterModule.forRoot(),
    AnalyticsModule,
    NotificationsModule,
    ScheduleModule.forRoot(),
    CurrencyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
