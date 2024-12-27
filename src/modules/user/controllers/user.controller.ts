import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { Auth } from '../../auth/decorators/auth.decorator';
import { User } from '../decorators/user.decorator';
import { UserDto } from '../dto/user.dto';
import { plainToInstance } from 'class-transformer';
import { UserUpdateDto } from '../dto/user-update.dto';
import { UserMemberDto } from '../dto/user-member.dto';
import { UserRolesEnum } from '../../common/enums/roles.enum';
import { User as UserEntity } from '../entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileSystemService } from '../../files/file.service';
import { PaginationWithFilters } from '../../common/interfaces/pagination.interface';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('users')
export class UserController {
  constructor(
    private readonly _userService: UserService,
    private readonly _fileSystemService: FileSystemService,
  ) {}

  @Auth()
  @Get('/me')
  async me(@User() user): Promise<UserDto> {
    const _user = await this._userService.findOneByEmail(user.email);
    return plainToInstance(UserDto, _user, { excludeExtraneousValues: true });
  }

  @Auth()
  @Post('/update')
  @Roles([
    UserRolesEnum.SHIPPER,
    UserRolesEnum.SHIPPER_MEMBER,
    UserRolesEnum.SHIPPER_DEMO,
  ])
  async updateMe(@User() user, @Body() newData: UserUpdateDto) {
    return this._userService.updateUserInfo(newData, user._id);
  }

  @Auth()
  @Post('/create-member')
  @Roles([UserRolesEnum.SHIPPER, UserRolesEnum.SHIPPER_DEMO])
  async createMember(@User() user, @Body() newUserData: UserMemberDto) {
    const shipperUser = await this._userService.findOneById(user._id);

    const newUser = {
      ...newUserData,
      role: UserRolesEnum.SHIPPER_MEMBER,
      referral_id: user._id,
      logo: shipperUser?.logo,
    };

    return !!(await this._userService.create(newUser));
  }

  @Auth()
  @Get('/members')
  @Roles([UserRolesEnum.SHIPPER, UserRolesEnum.SHIPPER_DEMO])
  async getMembers(@User() user, @Query() params: PaginationWithFilters) {
    return this._userService.findMembers(user._id, params);
  }

  @Auth()
  @Post('/update-member')
  @Roles([UserRolesEnum.SHIPPER, UserRolesEnum.SHIPPER_DEMO])
  async updateMemberInfo(@User() user, @Body() body: Partial<UserEntity>) {
    return !!(await this._userService.updateMemberInfo(body, user._id));
  }

  @Auth()
  @Post('upload-logo')
  @UseInterceptors(FileInterceptor('file'))
  @Roles([UserRolesEnum.SHIPPER, UserRolesEnum.SHIPPER_DEMO])
  async uploadFile(@UploadedFile() file: Express.Multer.File, @User() user) {
    if (user.logo) {
      try {
        await this._fileSystemService.deleteImage(user.logo);
      } catch {}
    }
    const imageId = await this._fileSystemService.storeImage(file);
    await this._userService.updateReferralsInfo({ logo: imageId }, user._id);
    return !!(await this._userService.updateUserInfo(
      { logo: imageId },
      user._id,
    ));
  }
}
