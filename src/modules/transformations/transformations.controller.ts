import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { type FastifyRequest, type FastifyReply } from 'fastify';
import { TransformationsService } from './transformations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GetHistoryQueryDto } from './dto/get-history-query.dto';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { AbstractStorage } from './storage/abstract-storage';

@UseGuards(JwtAuthGuard)
@Controller()
export class TransformationsController {
  constructor(
    private readonly transformationsService: TransformationsService,
    private readonly storage: AbstractStorage,
  ) {}

  @Get('api/convert/formats')
  getFormats() {
    return this.transformationsService.getFormats();
  }

  @Get('api/convert/:fileId')
  async downloadSavedFile(
    @Param('fileId') fileId: string,
    @Res() res: FastifyReply,
  ) {
    const stream = await this.storage.get(fileId);
    const ext = fileId.split('.').pop();

    res.header('Content-Disposition', `attachment; filename="download.${ext}"`);
    return res.send(stream);
  }

  @Post('api/convert')
  async convertFile(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @CurrentUser('id') userId: string,
    @Query('save') saveQuery?: string,
  ) {
    const shouldSave = saveQuery === 'true';

    if (!req.isMultipart()) {
      throw new BadRequestException('Request must be multipart/form-data');
    }

    const startTime = Date.now();
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

    const type = ['png', 'jpeg', 'jpg', 'svg'].includes(sourceFormat)
      ? 'image'
      : 'file';

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

      if (shouldSave) {
        const metadata = await this.storage.save(
          result.stream,
          result.extension,
          result.contentType,
        );

        this.transformationsService
          .logHistory({
            userId,
            type,
            sourceFormat,
            targetFormat,
            status: 'success',
            durationMs: Date.now() - startTime,
            fileId: metadata.fileId,
            fileSize: metadata.size,
          })
          .catch((err) => console.error('Failed to log history', err));

        return res.send({
          message: 'File converted and saved successfully',
          fileId: metadata.fileId,
          downloadUrl: `/api/convert/${metadata.fileId}`,
        });
      }

      this.transformationsService
        .logHistory({
          userId,
          type,
          sourceFormat,
          targetFormat,
          status: 'success',
          durationMs: Date.now() - startTime,
        })
        .catch((err) => console.error('Failed to log history', err));

      res.header('Content-Type', result.contentType);
      res.header(
        'Content-Disposition',
        `attachment; filename="converted.${result.extension}"`,
      );

      return res.send(result.stream);
    } catch (e: unknown) {
      if (!data.file.destroyed) {
        data.file.destroy();
      }

      this.transformationsService
        .logHistory({
          userId,
          type,
          sourceFormat,
          targetFormat,
          status: 'error',
          errorCode: (e instanceof Error ? e.message : '') || 'UNKNOWN_ERROR',
          durationMs: Date.now() - startTime,
        })
        .catch((err) => console.error('Failed to log history', err));

      throw e;
    }
  }

  @Get('api/transformations/history')
  getSelfHistory(
    @CurrentUser('id') userId: string,
    @Query() query: GetHistoryQueryDto,
  ) {
    return this.transformationsService.getHistory(userId, query);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('transformations.history.admin')
  @Get('admin/users/:userId/transformations/history')
  getAdminHistory(
    @Param('userId') targetUserId: string,
    @Query() query: GetHistoryQueryDto,
  ) {
    return this.transformationsService.getHistory(targetUserId, query);
  }
}
