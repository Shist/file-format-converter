import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionsDto,
} from './dto/role.dto';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RequirePermissions } from './decorators/require-permissions.decorator';

@ApiTags('RBAC')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('rbac.manage')
@Controller('admin/rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @ApiOperation({ summary: 'Get all roles and their assigned permissions' })
  getRoles() {
    return this.rbacService.getRoles();
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a new role' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Put('roles/:id')
  @ApiOperation({ summary: 'Update role details' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete a role' })
  deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  @Put('roles/:id/permissions')
  @ApiOperation({ summary: 'Assign a list of permission UUIDs to a role' })
  assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rbacService.assignPermissionsToRole(id, dto.permissionIds);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all available permissions' })
  getPermissions() {
    return this.rbacService.getPermissions();
  }

  @Post('permissions')
  @ApiOperation({ summary: 'Create a new permission' })
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  @Put('permissions/:id')
  @ApiOperation({ summary: 'Update permission details' })
  updatePermission(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    return this.rbacService.updatePermission(id, dto);
  }

  @Delete('permissions/:id')
  @ApiOperation({ summary: 'Delete a permission' })
  deletePermission(@Param('id') id: string) {
    return this.rbacService.deletePermission(id);
  }
}
