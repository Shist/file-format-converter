import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 201, description: 'Successful login (Sets Cookies)' })
  @ApiResponse({ status: 401, description: 'Incorrect credentials' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    const tokens = this.authService.login(user);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Successful login', user: tokens.user };
  }

  @Post('request-otp')
  @ApiOperation({
    summary: 'Request OTP for passwordless login or registration',
  })
  async requestOtp(@Body() body: RequestOtpDto) {
    await this.otpService.generateAndSendOtp(body.email);
    return { message: 'If such an email exists, we have sent a code.' };
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and login' })
  @ApiResponse({ status: 201, description: 'Successful passwordless login' })
  async verifyOtp(
    @Body() body: VerifyOtpDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    await this.otpService.verifyOtp(body.email, body.code);
    const tokens = await this.authService.passwordlessLogin(body.email);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Successful passwordless login', user: tokens.user };
  }

  @Post('refresh')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Refresh access tokens using refresh_token cookie' })
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken)
      throw new UnauthorizedException("Refresh token wasn't found");
    const tokens = await this.authService.refreshToken(refreshToken);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Tokens successfully updated', user: tokens.user };
  }

  private setCookies(res: FastifyReply, access: string, refresh: string) {
    const opts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
    res.setCookie('access_token', access, opts);
    res.setCookie('refresh_token', refresh, opts);
  }
}
