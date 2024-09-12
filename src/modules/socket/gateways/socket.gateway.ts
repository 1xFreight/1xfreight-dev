import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { SocketService } from 'src/modules/socket/services/socket.service';
import { Server, Socket } from 'socket.io';
import * as cookie from 'cookie';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../auth/auth.service';
import { User } from '../../user/entities/user.entity';

@WebSocketGateway()
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private _socketService: SocketService,
    private _authService: AuthService,
  ) {}

  @WebSocketServer() public server: Server;

  afterInit(server: Server) {
    this._socketService.wss = server;
  }

  handleDisconnect() {}

  async handleConnection(client: Socket) {
    if (!client.handshake.headers.cookie) return client.disconnect();

    const cookies = cookie.parse(client.handshake.headers.cookie);

    const { accessToken } = cookies;
    const user: Partial<User> = new JwtService().decode(accessToken) as User;

    if (!user) return;
    client.join(user._id.toString());
  }
}
