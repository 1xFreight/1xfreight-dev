import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { User } from '../entities/user.entity';
import { UserAdminService } from '../services/user-admin.service';
import { Auth } from '../../auth/decorators/auth.decorator';

@Controller('users/admin')
export class UserAdminController {
  constructor(
    private readonly _userService: UserService,
    private readonly _userAdminService: UserAdminService,
  ) {}

  @Post('/demo')
  async registerUserForDemo(@Body() user: Partial<User>) {
    return !!(await this._userAdminService.saveUserAsDemo(user));
  }

  @Auth()
  @Get('/demo')
  async getRegisteredForDemoUsers() {
    return await this._userAdminService.getWaitingDemoUsers();
  }

  @Auth()
  @Post('/edit')
  async editUserAsAdmin(@Body() user: Partial<User>) {
    return await this._userAdminService.editUser(user._id.toString(), user);
  }
}
