import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { FileSystemService } from './file.service';
import { Response } from 'express';
import { Auth } from '../auth/decorators/auth.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('file-system')
export class FileSystemController {
  constructor(private readonly fileSystemService: FileSystemService) {}

  // @Auth()
  // @Post('upload')
  // @UseInterceptors(FileInterceptor('file'))
  // async uploadFile(@UploadedFile() file: Express.Multer.File) {
  //   const imageId = await this.fileSystemService.storeImage(file);
  //   return { imageId };
  // }

  @Get('image/:id')
  async getImage(@Param('id') id: string, @Res() res: Response) {
    const image = await this.fileSystemService.getImage(id);
    res.setHeader('Content-Type', 'image/jpeg'); // Adjust based on the image type
    res.send(image);
  }
}
