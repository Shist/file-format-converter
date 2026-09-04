import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './strategies/jwt.strategy';

export type ValidatedUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  login(user: ValidatedUser) {
    const payload = { sub: user.id, email: user.email, role: user.role?.name };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as '30d',
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async passwordlessLogin(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('User with this email not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;

    return this.login(result);
  }

  async refreshToken(oldRefreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      });

      const user = await this.usersService.findOneById(payload.sub);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user;

      return this.login(result as ValidatedUser);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
