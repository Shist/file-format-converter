import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

interface RequestWithUser extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException("You don't have a role assigned.");
    }

    // TODO: Here we'll need to go to the database, get permissions for user.role
    // and check if any of them contain the required Permissions.

    if (user.role === 'admin') {
      // Unsafe member access .role on an `any` value.
      return true;
    }

    throw new ForbiddenException('Insufficient rights to perform the action');
  }
}
