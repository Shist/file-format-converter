import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'manager', description: 'Unique role name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Can manage users but not settings' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'manager' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class AssignPermissionsDto {
  @ApiProperty({
    type: [String],
    description: 'Array of Permission UUIDs to assign to the role',
    example: ['d3099ba2-127c-ba21-a5d1-20236f3abc12'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}
