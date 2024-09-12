import { Controller, Get, Param, Res } from '@nestjs/common';
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
    const { data, filename, contentType } =
      await this.fileSystemService.getImage(id);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.send(data);
  }

  @Auth()
  @Get('document/:id')
  async getDocument(@Param('id') id: string, @Res() res: Response) {
    const { data, filename, contentType } =
      await this.fileSystemService.getImage(id);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.send(data);
  }
}
