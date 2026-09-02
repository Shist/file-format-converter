import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@test.com', description: 'User email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'superpassword', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
