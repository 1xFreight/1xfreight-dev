import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '../user/decorators/user.decorator';
import { FileSystemService } from '../files/file.service';
import { QuoteService } from '../quote/services/quote.service';
import { SocketService } from '../socket/services/socket.service';
import { WebSocketGateway } from '@nestjs/websockets';
import { EventEmitter2 } from '@nestjs/event-emitter';
@Controller('/chat')
export class ChatController {
  constructor(
    private readonly _chatService: ChatService,
    private readonly _fileService: FileSystemService,
    private readonly _quoteService: QuoteService,
    private readonly _socketService: SocketService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Auth()
  @Post('upload-document/:room')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @User() user,
    @Param('room') room: string,
  ) {
    const isValid = this._quoteService.verifyUserAccessToRoom(user, room);

    if (!isValid) {
      throw new BadRequestException('Unauthorized chat room');
    }

    const fileId = await this._fileService.storeImage(file);
    const { originalname, size } = file;

    const message = await this._chatService.addMessage(
      user._id,
      {
        message: '',
        room: room,
        user_id: user._id,
        document: fileId,
        documentName: originalname,
        documentSize: size,
      },
      user.email,
    );

    this.eventEmitter.emit('new-message-upload-file', { room, message });

    return true;
  }
}
