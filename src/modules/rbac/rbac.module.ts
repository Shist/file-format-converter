import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RbacService } from './rbac.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, PermissionEntity])],
  providers: [RbacService],
  exports: [TypeOrmModule, RbacService],
})
export class RbacModule {}
