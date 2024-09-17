import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ChatService } from './chat.service';
import { SocketUser } from '../socket/decorators/socket-user.decorator';
import { SocketAuth } from '../auth/decorators/socket-auth.decorator';
import { QuoteService } from '../quote/services/quote.service';
import { OnEvent } from '@nestjs/event-emitter';
import { Chat } from './chat.entity';

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway {
  @WebSocketServer()
  private _wss: Server;
  private clientToRoom: Record<string, string> = {};

  constructor(
    private readonly _chatService: ChatService,
    private readonly _quoteService: QuoteService,
  ) {}

  @OnEvent('new-message-upload-file')
  async notifyDocumentUpload(data: any) {
    this._wss.to(data.room).emit('new-message', data.message);
  }

  @SocketAuth()
  @SubscribeMessage('new-message')
  async newMessage(
    @SocketUser() user,
    @MessageBody() message: string,
    @ConnectedSocket() client,
  ) {
    const userRoom = this.clientToRoom[client.id];

    if (!userRoom) return;

    const savedMessage = await this._chatService.addMessage(user._id, {
      message,
      room: userRoom,
    });

    this._wss.to(userRoom).emit('new-message', savedMessage);
  }

  @SocketAuth()
  @SubscribeMessage('join-room')
  async joinRoom(
    @ConnectedSocket() client,
    @SocketUser() user,
    @MessageBody() room: string,
  ) {
    const isValid = await this._quoteService.verifyUserAccessToRoom(user, room);

    if (!isValid) {
      throw new WsException('Unauthorized');
    }

    const prevRoom = this.clientToRoom[client.id];

    if (prevRoom) {
      client.leave();
    }

    this.clientToRoom[client.id] = room;
    client.join(room);

    return await this._chatService.getRoomMessages(room);
  }
}
