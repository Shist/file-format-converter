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

    const options: Record<string, unknown> = { sourceFormat };

    const qualityField = data.fields['quality'];
    if (qualityField && 'value' in qualityField) {
      options.quality = parseInt(String(qualityField.value), 10);
    }

    const widthField = data.fields['width'];
    if (widthField && 'value' in widthField) {
      options.width = parseInt(String(widthField.value), 10);
    }

    const heightField = data.fields['height'];
    if (heightField && 'value' in heightField) {
      options.height = parseInt(String(heightField.value), 10);
    }

    const backgroundField = data.fields['background'];
    if (backgroundField && 'value' in backgroundField) {
      options.background = String(backgroundField.value);
    }

    try {
      const result = await this.transformationsService.convert(
        data.file,
        sourceFormat,
        targetFormat,
        options,
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
