import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetHistoryQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsIn(['file', 'image'])
  type?: 'file' | 'image';

  @IsOptional()
  @IsString()
  sourceFormat?: string;

  @IsOptional()
  @IsString()
  targetFormat?: string;

  @IsOptional()
  @IsIn(['success', 'error'])
  status?: 'success' | 'error';
}
