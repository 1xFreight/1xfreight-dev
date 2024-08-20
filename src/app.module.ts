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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
