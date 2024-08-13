import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { User } from './decorators/user.decorator';
import { UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';

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
    console.log(_user);
    return plainToInstance(UserDto, _user, { excludeExtraneousValues: true });
  }
}
