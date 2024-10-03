import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from './chat.entity';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { QuoteModule } from '../quote/quote.module';
import { ChatController } from './chat.controller';
import { FileSystemModule } from '../files/file.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Chat.name,
        schema: ChatSchema,
      },
    ]),
    AuthModule,
    QuoteModule,
    FileSystemModule,
    NotificationsModule,
  ],
  providers: [ChatService, ChatGateway, ChatController],
  controllers: [ChatController],
})
export class ChatModule {}
