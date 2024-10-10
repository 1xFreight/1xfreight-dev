import { Module } from '@nestjs/common';
import { EmailService } from './emailer.service';
import { NotificationsController } from './notifications.controller';
import { MongooseModule } from '@nestjs/mongoose';
import forFeatureDb from '../db/for-feature.db';
import { AuthModule } from '../auth/auth.module';
import { NotificationsService } from './notifications.service';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports: [MongooseModule.forFeature(forFeatureDb), AuthModule],
  providers: [EmailService, NotificationsService, NotificationGateway],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
