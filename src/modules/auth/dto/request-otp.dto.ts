import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ example: 'user@test.com', description: 'User email for OTP' })
  @IsEmail()
  email!: string;
}
