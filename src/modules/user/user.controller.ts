import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { User } from './decorators/user.decorator';
import { UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';
import { UserUpdateDto } from './dto/user-update.dto';

@Controller('users')
export class UserController {
  constructor(private readonly _userService: UserService) {}

  @Get('/create-test')
  async createTest() {
    // return this._userService.create();
  }

  @Auth()
  @Get('/me')
  async me(@User() user): Promise<UserDto> {
    const _user = await this._userService.findOneByEmail(user.email);
    return plainToInstance(UserDto, _user, { excludeExtraneousValues: true });
  }

  @Auth()
  @Post('/update')
  async updateMe(@User() user, @Body() newUserData: UserUpdateDto) {
    return this._userService.updateUserInfo(newUserData, user._id);
  }
}
