import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestEmailChangeDto {
  @ApiProperty({
    example: 'new_email@test.com',
    description: 'New email address',
  })
  @IsEmail()
  newEmail!: string;
}

export class VerifyEmailChangeDto {
  @ApiProperty({
    example: 'new_email@test.com',
    description: 'New email address',
  })
  @IsEmail()
  newEmail!: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  code!: string;
}
