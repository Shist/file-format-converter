import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../user.entity';

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'user@test.com' })
  email!: string;

  @ApiPropertyOptional({
    example: 'admin',
    description: 'Omitted for non-privileged users',
  })
  role?: string;

  @ApiProperty({ example: '2026-08-27T07:06:44.218Z' })
  createdAt!: Date;

  static mapToResponse(user: User, isPrivileged: boolean): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.createdAt = user.createdAt;

    if (isPrivileged) {
      dto.email = user.email;
      dto.role = user.role?.name;
    } else {
      dto.email = this.maskEmail(user.email);
      dto.role = undefined;
    }

    return dto;
  }

  private static maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!name || !domain) {
      return email;
    }

    if (name.length <= 2) {
      return `***@${domain}`;
    }

    const visiblePart = name.substring(0, 2);
    return `${visiblePart}***@${domain}`;
  }
}
