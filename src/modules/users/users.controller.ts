import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Patch,
  Body,
  UseGuards,
  Delete,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { UsersService } from './users.service';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  RequestEmailChangeDto,
  VerifyEmailChangeDto,
} from './dto/change-email.dto';
import { OtpService } from '../auth/otp.service';
import { VerifyDeleteDto } from './dto/delete-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { type ActiveUserData } from '../auth/interfaces/active-user-data.interface';

@ApiTags('Users')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findOneById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile (except email)' })
  updateSelf(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    delete dto.role;
    return this.usersService.update(userId, dto);
  }

  @Post('me/change-email/request')
  @ApiOperation({ summary: 'Request email change (Sends OTP)' })
  async requestEmailChange(@Body() dto: RequestEmailChangeDto) {
    await this.usersService.checkEmailAvailability(dto.newEmail);
    await this.otpService.generateAndSendOtp(dto.newEmail);
    return { message: 'Verification code sent to the new email' };
  }

  @Post('me/change-email/verify')
  @ApiOperation({ summary: 'Verify OTP and change email' })
  async verifyEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyEmailChangeDto,
  ) {
    await this.otpService.verifyOtp(dto.newEmail, dto.code);
    const updatedUser = await this.usersService.updateEmail(
      userId,
      dto.newEmail,
    );
    return { message: 'Email successfully changed', user: updatedUser };
  }

  @RequirePermissions('users.list')
  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and search (Admin)' })
  async getUsers(
    @Query() query: GetUsersQueryDto,
    @CurrentUser() currentUser: ActiveUserData,
  ) {
    const result = await this.usersService.findAll(query);
    const isAdmin =
      currentUser.role === 'admin' || currentUser.role === 'manager';

    const mappedItems = result.items.map((user) =>
      UserResponseDto.mapToResponse(user, isAdmin),
    );

    return { items: mappedItems, nextCursor: result.nextCursor };
  }

  @RequirePermissions('users.read')
  @Get(':id')
  @ApiOperation({ summary: 'Get specific user profile (Admin)' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: ActiveUserData,
  ) {
    const user = await this.usersService.findOneById(id);
    const isPrivileged =
      currentUser.id === id ||
      currentUser.role === 'admin' ||
      currentUser.role === 'manager';

    return UserResponseDto.mapToResponse(user, isPrivileged);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user (Admin)' })
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body.email, body.password, body.role);
  }

  @RequirePermissions('users.update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update specific user (Admin)' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post('me/delete/request')
  @ApiOperation({ summary: 'Request self account deletion (Sends OTP)' })
  async requestSelfDelete(@CurrentUser('email') email: string) {
    await this.otpService.generateAndSendOtp(email);
    return { message: 'Verification code sent to confirm account deletion' };
  }

  @Post('me/delete/verify')
  @ApiOperation({ summary: 'Verify OTP and delete self account' })
  async verifySelfDelete(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string,
    @Body() dto: VerifyDeleteDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    await this.otpService.verifyOtp(email, dto.code);
    await this.usersService.remove(userId);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Your account has been successfully deleted' };
  }

  @RequirePermissions('users.delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID (Admin)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
