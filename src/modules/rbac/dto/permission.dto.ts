import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: 'users.read', description: 'Unique permission slug' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ example: 'Allows reading user data' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({ example: 'users.read' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
