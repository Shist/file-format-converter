import { IsString } from 'class-validator';

export class VerifyDeleteDto {
  @IsString()
  code!: string;
}
