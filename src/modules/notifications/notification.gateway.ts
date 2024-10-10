import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { SocketAuth } from '../auth/decorators/socket-auth.decorator';
import { SocketUser } from '../socket/decorators/socket-user.decorator';
import { NotificationsService } from './notifications.service';
import { Server } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({ namespace: 'notification' })
export class NotificationGateway {
  @WebSocketServer()
  private _wss: Server;
  private clientToRoom: Record<string, string> = {};

  constructor(private readonly _notificationService: NotificationsService) {}
  @SocketAuth()
  @SubscribeMessage('get-notifications')
  async getUserNotifications(@SocketUser() user, @ConnectedSocket() client) {
    const prevRoom = this.clientToRoom[client.id];

    if (prevRoom) {
      client.leave();
    }

    this.clientToRoom[client.id] = user._id.toString();
    client.join(user._id);

    return this._notificationService.getUserNotifications(user._id);
  }

  @SocketAuth()
  @SubscribeMessage('clear-all')
  async clearNotifications(@SocketUser() user) {
    return this._notificationService.clearAllUserNotifications(user._id);
  }

  @SocketAuth()
  @SubscribeMessage('clear-one')
  async clearOne(@SocketUser() user, @MessageBody() body) {
    return this._notificationService.clearOneUserNotification(
      user._id,
      body._id,
    );
  }

  @OnEvent('new-notification')
  async notifyUser(data: any) {
    this._wss.to(data.room.toString()).emit('new-notification', data.data);
  }
}
