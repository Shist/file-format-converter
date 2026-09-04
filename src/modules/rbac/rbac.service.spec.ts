import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { RbacService } from './rbac.service';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from './entities/permission.entity';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('RbacService', () => {
  let service: RbacService;
  let roleRepository: MockRepository<RoleEntity>;
  let permissionRepository: MockRepository<PermissionEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PermissionEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
    roleRepository = module.get<MockRepository<RoleEntity>>(
      getRepositoryToken(RoleEntity),
    );
    permissionRepository = module.get<MockRepository<PermissionEntity>>(
      getRepositoryToken(PermissionEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Roles', () => {
    it('should get all roles', async () => {
      const mockRoles = [{ id: '1', name: 'admin' } as RoleEntity];
      roleRepository.find?.mockResolvedValue(mockRoles);

      const result = await service.getRoles();
      expect(roleRepository.find).toHaveBeenCalledWith({
        relations: ['permissions'],
      });
      expect(result).toEqual(mockRoles);
    });

    it('should create a role', async () => {
      roleRepository.findOne?.mockResolvedValue(null);
      const mockRole = { id: '1', name: 'user' } as RoleEntity;
      roleRepository.create?.mockReturnValue(mockRole);
      roleRepository.save?.mockResolvedValue(mockRole);

      const result = await service.createRole({ name: 'user' });
      expect(result).toEqual(mockRole);
    });

    it('should throw ConflictException if role already exists', async () => {
      roleRepository.findOne?.mockResolvedValue({
        id: '1',
        name: 'user',
      } as RoleEntity);

      await expect(service.createRole({ name: 'user' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update a role', async () => {
      const mockRole = { id: '1', name: 'old' } as RoleEntity;
      roleRepository.findOne?.mockResolvedValue(mockRole);
      roleRepository.save?.mockResolvedValue({
        ...mockRole,
        name: 'new',
      } as RoleEntity);

      const result = await service.updateRole('1', { name: 'new' });
      expect(result.name).toBe('new');
    });

    it('should throw NotFoundException on update if role not found', async () => {
      roleRepository.findOne?.mockResolvedValue(null);
      await expect(service.updateRole('1', { name: 'new' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete a role without permissions', async () => {
      const mockRole = {
        id: '1',
        name: 'user',
        permissions: [],
      } as unknown as RoleEntity;
      roleRepository.findOne?.mockResolvedValue(mockRole);
      roleRepository.remove?.mockResolvedValue(mockRole);

      await service.deleteRole('1');
      expect(roleRepository.remove).toHaveBeenCalledWith(mockRole);
    });

    it('should throw ConflictException when deleting role with permissions', async () => {
      const mockRole = {
        id: '1',
        name: 'admin',
        permissions: [{ id: 'p1' }],
      } as unknown as RoleEntity;
      roleRepository.findOne?.mockResolvedValue(mockRole);

      await expect(service.deleteRole('1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when deleting non-existent role', async () => {
      roleRepository.findOne?.mockResolvedValue(null);
      await expect(service.deleteRole('1')).rejects.toThrow(NotFoundException);
    });

    it('should assign permissions to role', async () => {
      const mockRole = { id: '1', name: 'user' } as RoleEntity;
      const mockPermissions = [
        { id: 'p1', slug: 'read' },
      ] as PermissionEntity[];

      roleRepository.findOne?.mockResolvedValue(mockRole);
      permissionRepository.find?.mockResolvedValue(mockPermissions);
      roleRepository.save?.mockResolvedValue({
        ...mockRole,
        permissions: mockPermissions,
      } as RoleEntity);

      const result = await service.assignPermissionsToRole('1', ['p1']);

      expect(permissionRepository.find).toHaveBeenCalled();
      expect(result.permissions).toEqual(mockPermissions);
    });

    it('should throw NotFoundException if role not found during permission assignment', async () => {
      roleRepository.findOne?.mockResolvedValue(null);
      await expect(
        service.assignPermissionsToRole('1', ['p1']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Permissions', () => {
    it('should get all permissions', async () => {
      const mockPerms = [{ id: '1', slug: 'read' } as PermissionEntity];
      permissionRepository.find?.mockResolvedValue(mockPerms);

      const result = await service.getPermissions();
      expect(result).toEqual(mockPerms);
    });

    it('should create a permission', async () => {
      permissionRepository.findOne?.mockResolvedValue(null);
      const mockPerm = { id: '1', slug: 'write' } as PermissionEntity;
      permissionRepository.create?.mockReturnValue(mockPerm);
      permissionRepository.save?.mockResolvedValue(mockPerm);

      const result = await service.createPermission({ slug: 'write' });
      expect(result).toEqual(mockPerm);
    });

    it('should throw ConflictException if permission already exists', async () => {
      permissionRepository.findOne?.mockResolvedValue({
        id: '1',
        slug: 'read',
      } as PermissionEntity);

      await expect(service.createPermission({ slug: 'read' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update a permission', async () => {
      const mockPerm = { id: '1', slug: 'old' } as PermissionEntity;
      permissionRepository.findOne?.mockResolvedValue(mockPerm);
      permissionRepository.save?.mockResolvedValue({
        ...mockPerm,
        slug: 'new',
      } as PermissionEntity);

      const result = await service.updatePermission('1', { slug: 'new' });
      expect(result.slug).toBe('new');
    });

    it('should throw NotFoundException on update if permission not found', async () => {
      permissionRepository.findOne?.mockResolvedValue(null);
      await expect(
        service.updatePermission('1', { slug: 'new' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete a permission', async () => {
      const mockPerm = { id: '1', slug: 'read' } as PermissionEntity;
      permissionRepository.findOne?.mockResolvedValue(mockPerm);
      permissionRepository.remove?.mockResolvedValue(mockPerm);

      await service.deletePermission('1');
      expect(permissionRepository.remove).toHaveBeenCalledWith(mockPerm);
    });

    it('should throw NotFoundException when deleting non-existent permission', async () => {
      permissionRepository.findOne?.mockResolvedValue(null);
      await expect(service.deletePermission('1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return array of permission slugs', async () => {
      const mockRole = {
        name: 'admin',
        permissions: [{ slug: 'users.read' }, { slug: 'users.write' }],
      } as unknown as RoleEntity;
      roleRepository.findOne?.mockResolvedValue(mockRole);

      const result = await service.getPermissionsForRole('admin');
      expect(result).toEqual(['users.read', 'users.write']);
    });

    it('should return empty array if role not found or has no permissions', async () => {
      roleRepository.findOne?.mockResolvedValue(null);
      const result = await service.getPermissionsForRole('unknown');
      expect(result).toEqual([]);
    });
  });
});
