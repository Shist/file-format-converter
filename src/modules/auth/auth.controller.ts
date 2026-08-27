import { Controller, Post, Body, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    const tokens = this.authService.login(user);

    res.setCookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.setCookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Успешный вход', user: tokens.user };
  }
}
