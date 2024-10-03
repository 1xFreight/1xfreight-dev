import { Controller, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notify')
export class NotificationsController {
  constructor(private readonly _notificationService: NotificationsService) {}

  @Get('/test')
  async testIt() {
    // this._notificationService.notifyNewMessage(
    //   '66d72d0f4aae7a6c10a21436:66d836070b680b72abf525b5',
    //   'Nonexistent test message to room',
    //   'dredd1@test.com',
    // );
    this._notificationService.notifyNewQuote('66e012244975db0026f03e2a');
  }
}
