import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RbacService } from '../rbac.service';

interface RequestWithUser extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const userPermissions = await this.rbacService.getPermissionsForRole(
      user.role,
    );
    const hasPermission = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );
    if (hasPermission) {
      return true;
    }

    throw new ForbiddenException('Insufficient rights to perform the action');
  }
}
