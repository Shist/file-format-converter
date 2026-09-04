import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { RbacService } from '../rbac.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Partial<Record<keyof Reflector, jest.Mock>>;
  let rbacService: Partial<Record<keyof RbacService, jest.Mock>>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    rbacService = { getPermissionsForRole: jest.fn() };

    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      rbacService as unknown as RbacService,
    );
  });

  const createMockContext = (user?: { role: string }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('should allow access if no permissions are required', async () => {
    reflector.getAllAndOverride?.mockReturnValue(null);
    const result = await guard.canActivate(createMockContext());
    expect(result).toBe(true);
  });

  it('should allow access if user has required permissions', async () => {
    reflector.getAllAndOverride?.mockReturnValue(['users.read']);
    rbacService.getPermissionsForRole?.mockResolvedValue([
      'users.read',
      'users.write',
    ]);

    const result = await guard.canActivate(
      createMockContext({ role: 'admin' }),
    );
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required permissions', async () => {
    reflector.getAllAndOverride?.mockReturnValue(['users.delete']);
    rbacService.getPermissionsForRole?.mockResolvedValue(['users.read']);

    await expect(
      guard.canActivate(createMockContext({ role: 'user' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user is not attached to request', async () => {
    reflector.getAllAndOverride?.mockReturnValue(['users.read']);

    await expect(guard.canActivate(createMockContext())).rejects.toThrow(
      ForbiddenException,
    );
  });
});
