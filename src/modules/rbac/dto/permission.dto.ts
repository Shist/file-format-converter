import { IsString, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
