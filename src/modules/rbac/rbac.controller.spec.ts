import { Test, TestingModule } from '@nestjs/testing';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

describe('RbacController', () => {
  let controller: RbacController;
  let service: Partial<Record<keyof RbacService, jest.Mock>>;

  beforeEach(async () => {
    service = {
      getRoles: jest.fn(),
      createRole: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      assignPermissionsToRole: jest.fn(),
      getPermissions: jest.fn(),
      createPermission: jest.fn(),
      updatePermission: jest.fn(),
      deletePermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RbacController],
      providers: [{ provide: RbacService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RbacController>(RbacController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should handle role endpoints', async () => {
    await controller.getRoles();
    expect(service.getRoles).toHaveBeenCalled();

    await controller.createRole({ name: 'admin' });
    expect(service.createRole).toHaveBeenCalledWith({ name: 'admin' });

    await controller.updateRole('1', { name: 'admin2' });
    expect(service.updateRole).toHaveBeenCalledWith('1', { name: 'admin2' });

    await controller.deleteRole('1');
    expect(service.deleteRole).toHaveBeenCalledWith('1');

    await controller.assignPermissions('1', { permissionIds: ['p1'] });
    expect(service.assignPermissionsToRole).toHaveBeenCalledWith('1', ['p1']);
  });

  it('should handle permission endpoints', async () => {
    await controller.getPermissions();
    expect(service.getPermissions).toHaveBeenCalled();

    await controller.createPermission({ slug: 'read' });
    expect(service.createPermission).toHaveBeenCalledWith({ slug: 'read' });

    await controller.updatePermission('1', { slug: 'read2' });
    expect(service.updatePermission).toHaveBeenCalledWith('1', {
      slug: 'read2',
    });

    await controller.deletePermission('1');
    expect(service.deletePermission).toHaveBeenCalledWith('1');
  });
});
