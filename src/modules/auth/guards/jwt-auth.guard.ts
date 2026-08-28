import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      if (err instanceof Error) {
        throw err;
      } else {
        throw new UnauthorizedException('Authorization required');
      }
    }
    return user;
  }
}
