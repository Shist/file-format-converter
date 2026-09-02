import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@test.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'superpassword', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({
    example: 'admin',
    description: 'Role name (defaults to user)',
  })
  @IsOptional()
  @IsString()
  role?: string;
}
