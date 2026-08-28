import { IsEmail, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  newEmail!: string;
}

export class VerifyEmailChangeDto {
  @IsEmail()
  newEmail!: string;

  @IsString()
  code!: string;
}
