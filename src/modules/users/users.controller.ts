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
} from '@nestjs/common';
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

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findOneById(userId);
  }

  @Patch('me')
  updateSelf(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    delete dto.role;
    return this.usersService.update(userId, dto);
  }

  @Post('me/change-email/request')
  async requestEmailChange(@Body() dto: RequestEmailChangeDto) {
    await this.usersService.checkEmailAvailability(dto.newEmail);
    await this.otpService.generateAndSendOtp(dto.newEmail);
    return { message: 'Verification code sent to the new email' };
  }

  @Post('me/change-email/verify')
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
  getUsers(@Query() query: GetUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @RequirePermissions('users.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOneById(id);
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body.email, body.password, body.role);
  }

  @RequirePermissions('users.update')
  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @RequirePermissions('users.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
