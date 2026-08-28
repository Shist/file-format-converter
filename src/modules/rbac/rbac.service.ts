import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from './entities/permission.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  async getRoles(): Promise<RoleEntity[]> {
    return this.roleRepository.find({ relations: ['permissions'] });
  }

  async createRole(dto: CreateRoleDto): Promise<RoleEntity> {
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('A role with this name already exists');
    }

    const role = this.roleRepository.create(dto);
    return this.roleRepository.save(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role is not found');

    Object.assign(role, dto);
    return this.roleRepository.save(role);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('Role is not found');
    }

    if (role.permissions.length > 0) {
      throw new ConflictException(
        'You cannot delete a role that has permissions attached to it.',
      );
    }

    await this.roleRepository.remove(role);
  }

  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[],
  ): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role is not found');
    }

    const permissions = await this.permissionRepository.find({
      where: { id: In(permissionIds) },
    });

    role.permissions = permissions;
    return this.roleRepository.save(role);
  }

  async getPermissions(): Promise<PermissionEntity[]> {
    return this.permissionRepository.find();
  }

  async createPermission(dto: CreatePermissionDto): Promise<PermissionEntity> {
    const existing = await this.permissionRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('A permission with this slug already exists');
    }

    const permission = this.permissionRepository.create(dto);
    return this.permissionRepository.save(permission);
  }

  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionEntity> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException('Permission is not found');
    }

    Object.assign(permission, dto);
    return this.permissionRepository.save(permission);
  }

  async deletePermission(id: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException('Permission is not found');
    }

    await this.permissionRepository.remove(permission);
  }

  async getPermissionsForRole(roleName: string): Promise<string[]> {
    const role = await this.roleRepository.findOne({
      where: { name: roleName },
      relations: ['permissions'],
    });

    if (!role || !role.permissions) {
      return [];
    }

    return role.permissions.map((p) => p.slug);
  }
}
