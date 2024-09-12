import { Global, Module } from '@nestjs/common';
import { SocketService } from 'src/modules/socket/services/socket.service';
import { SocketGateway } from 'src/modules/socket/gateways/socket.gateway';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  providers: [SocketService, SocketGateway],
  exports: [SocketService, SocketGateway],
})
export class SocketModule {}
