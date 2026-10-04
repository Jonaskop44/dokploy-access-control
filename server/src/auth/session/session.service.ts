import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import { AppConfigService } from '../../config/app-config/app-config.service.js';
import { UserService } from '../../user/user.service.js';
import { JwtPayload } from '../types/auth-jwtPayload.js';

export const ACCESS_COOKIE = 'accessToken';
export const REFRESH_COOKIE = 'refreshToken';
export const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';

@Injectable()
export class SessionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfigService,
    private readonly userService: UserService,
  ) {}

  hashRefreshTokenInput(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  compareRefreshToken(token: string, hash: string) {
    return bcrypt.compare(this.hashRefreshTokenInput(token), hash);
  }

  async completeLogin(userId: string, response: Response) {
    const payload: JwtPayload = { id: userId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.appConfig.jwtAccessSecret,
        expiresIn: this.appConfig.jwtAccessExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.appConfig.jwtRefreshSecret,
        expiresIn: this.appConfig.jwtRefreshExpiresIn as any,
      }),
    ]);

    const hashed = await bcrypt.hash(
      this.hashRefreshTokenInput(refreshToken),
      12,
    );
    await this.userService.updateHashedRefreshToken(userId, hashed);

    response.cookie(ACCESS_COOKIE, accessToken, this.cookieOptions('/'));
    response.cookie(
      REFRESH_COOKIE,
      refreshToken,
      this.cookieOptions(REFRESH_COOKIE_PATH),
    );
  }

  async endSession(userId: string, response: Response) {
    await this.userService.updateHashedRefreshToken(userId, null);
    response.clearCookie(ACCESS_COOKIE, this.cookieOptions('/'));
    response.clearCookie(
      REFRESH_COOKIE,
      this.cookieOptions(REFRESH_COOKIE_PATH),
    );
  }

  cookieOptions(path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.appConfig.isProduction,
      sameSite: 'lax',
      path,
      domain: this.appConfig.cookieDomain,
    };
  }
}
