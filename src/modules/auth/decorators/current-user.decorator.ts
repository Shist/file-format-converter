import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ActiveUserData } from '../interfaces/active-user-data.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof ActiveUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const user = request.user;

    if (!user) return null;
    return data ? user[data] : user;
  },
);
