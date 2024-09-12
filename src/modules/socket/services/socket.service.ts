import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class SocketService {
  public wss: Server;

  emit(event: string, data: any) {
    this.wss.emit(event, data);
  }

  emitToUser(gainId: number, event: string, data: any) {
    this.wss.to(`${gainId}`).emit(event, data);
  }

  emitToRoom(room: string, event: string, data: any) {
    this.wss.to(room).emit(event, data);
  }
}
