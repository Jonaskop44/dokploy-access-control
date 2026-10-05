import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard.js';
import { AuthService, OAUTH_STATE_COOKIE } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { CallbackQueryDto } from './dto/callback-query.dto.js';
import { LoginQueryDto } from './dto/login-query.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  @Throttle({ default: { ttl: 15 * 60_000, limit: 10 } })
  login(@Query() query: LoginQueryDto, @Res() response: Response) {
    return this.authService.login(query.rememberMe, response);
  }

  @Get('callback')
  @Throttle({ default: { ttl: 15 * 60_000, limit: 10 } })
  callback(
    @Query() query: CallbackQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    return this.authService.handleCallback(
      query.code,
      query.state,
      request.cookies?.[OAUTH_STATE_COOKIE],
      response,
    );
  }

  @Post('refresh')
  @HttpCode(204)
  @Throttle({ default: { ttl: 15 * 60_000, limit: 30 } })
  @UseGuards(JwtRefreshGuard)
  refresh(
    @CurrentUser() user: Express.User,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.refresh(user, user.rememberMe, response);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(userId, response);
  }
}
