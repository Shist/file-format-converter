import { User } from '../user.entity';

export class UserResponseDto {
  id!: string;
  email!: string;
  role?: string;
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
