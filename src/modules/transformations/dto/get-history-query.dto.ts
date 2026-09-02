import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Pagination cursor' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ['file', 'image'] })
  @IsOptional()
  @IsIn(['file', 'image'])
  type?: 'file' | 'image';

  @ApiPropertyOptional({ description: 'e.g. csv, png, json' })
  @IsOptional()
  @IsString()
  sourceFormat?: string;

  @ApiPropertyOptional({ description: 'e.g. xml, jpeg' })
  @IsOptional()
  @IsString()
  targetFormat?: string;

  @ApiPropertyOptional({ enum: ['success', 'error'] })
  @IsOptional()
  @IsIn(['success', 'error'])
  status?: 'success' | 'error';
}
