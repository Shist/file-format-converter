import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { FastifyRequest } from 'fastify';
import { ActiveUserData } from '../interfaces/active-user-data.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: FastifyRequest) => {
          return request?.cookies?.access_token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'default_access_secret',
    });
  }

  validate(payload: JwtPayload): ActiveUserData {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
