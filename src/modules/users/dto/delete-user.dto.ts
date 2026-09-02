import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyDeleteDto {
  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  code!: string;
}
