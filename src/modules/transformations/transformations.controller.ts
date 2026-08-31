import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { type FastifyRequest, type FastifyReply } from 'fastify';
import { TransformationsService } from './transformations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/convert')
export class TransformationsController {
  constructor(
    private readonly transformationsService: TransformationsService,
  ) {}

  @Get('formats')
  getFormats() {
    return this.transformationsService.getFormats();
  }

  @Post()
  async convertFile(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    if (!req.isMultipart()) {
      throw new BadRequestException('Request must be multipart/form-data');
    }

    const data = await req.file();
    if (!data) {
      throw new BadRequestException('File is required');
    }

    const targetFormatField = data.fields['targetFormat'];
    const targetFormat =
      targetFormatField && 'value' in targetFormatField
        ? String(targetFormatField.value).toLowerCase()
        : null;

    if (!targetFormat) {
      throw new BadRequestException('targetFormat is required');
    }

    const sourceFormat = data.filename.split('.').pop()?.toLowerCase();
    if (!sourceFormat) {
      throw new BadRequestException(
        'Cannot determine source format from filename',
      );
    }

    try {
      const result = await this.transformationsService.convert(
        data.file,
        sourceFormat,
        targetFormat,
        { sourceFormat },
      );

      res.header('Content-Type', result.contentType);
      res.header(
        'Content-Disposition',
        `attachment; filename="converted.${result.extension}"`,
      );

      return res.send(result.stream);
    } catch (error) {
      if (!data.file.destroyed) {
        data.file.destroy();
      }
      throw error;
    }
  }
}
