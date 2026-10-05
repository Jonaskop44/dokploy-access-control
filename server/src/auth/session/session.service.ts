import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import { AppConfigService } from '../../config/app-config/app-config.service.js';
import { UserService } from '../../user/user.service.js';
import { JwtPayload } from '../types/auth-jwtPayload.js';
import { User } from '../../config/prisma/generated/client.js';

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

  async validateRefreshToken(userId: string, refreshToken: string) {
    const user = await this.userService.findById(userId);
    if (!user.hashedRefreshToken)
      throw new UnauthorizedException('No refresh token found');

    const isRefreshTokenValid = await this.compareRefreshToken(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!isRefreshTokenValid)
      throw new UnauthorizedException('Invalid refresh token');

    return { id: user.id };
  }

  async completeLogin(user: User, rememberMe: boolean, response: Response) {
    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      rememberMe,
    );
    const hashedRefreshToken = await bcrypt.hash(
      this.hashRefreshTokenInput(refreshToken),
      12,
    );

    await this.userService.updateHashedRefreshToken(
      user.id,
      hashedRefreshToken,
    );

    this.setAuthCookies(response, accessToken, refreshToken, rememberMe);

    return { ...user, hashedRefreshToken };
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

  private async generateTokens(user: User, rememberMe: boolean) {
    const payload: JwtPayload = {
      id: user.id,
      sub: {
        email: user.email,
        name: user.name,
        role: user.role,
        rememberMe,
      },
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.appConfig.jwtAccessSecret,
        expiresIn: this.appConfig
          .jwtAccessExpiresIn as JwtSignOptions['expiresIn'],
      }),
      this.jwtService.signAsync(payload, {
        secret: this.appConfig.jwtRefreshSecret,
        expiresIn: this.appConfig.jwtRefreshExpiresIn(
          rememberMe,
        ) as JwtSignOptions['expiresIn'],
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean,
  ) {
    const accessExp = this.jwtService.decode<{ exp: number }>(accessToken);
    const refreshExp = this.jwtService.decode<{ exp: number }>(refreshToken);

    response.cookie(ACCESS_COOKIE, accessToken, {
      ...this.cookieOptions('/'),
      maxAge: accessExp.exp * 1000 - Date.now(),
    });

    response.cookie(REFRESH_COOKIE, refreshToken, {
      ...this.cookieOptions(REFRESH_COOKIE_PATH),
      ...(rememberMe ? { maxAge: refreshExp.exp * 1000 - Date.now() } : {}),
    });
  }
}
