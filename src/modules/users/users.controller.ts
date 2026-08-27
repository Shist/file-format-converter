import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findOneById(userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('users.read')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('users.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOneById(id);
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body.email, body.password, body.role);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('users.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
