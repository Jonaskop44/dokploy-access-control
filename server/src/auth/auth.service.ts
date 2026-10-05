import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AppConfigService } from '../config/app-config/app-config.service.js';
import type { User } from '../config/prisma/generated/client.js';
import { UserService } from '../user/user.service.js';
import { EntraService } from './entra/entra.service.js';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  SessionService,
} from './session/session.service.js';

export const OAUTH_STATE_COOKIE = 'oauthState';
export const OAUTH_STATE_PATH = '/api/v1/auth/callback';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly entraService: EntraService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
    private readonly appConfig: AppConfigService,
  ) {}

  async login(rememberMe: boolean, response: Response) {
    const { url, state, verifier } =
      await this.entraService.createAuthRequest();

    response.cookie(
      OAUTH_STATE_COOKIE,
      JSON.stringify({ state, verifier, rememberMe }),
      {
        ...this.sessionService.cookieOptions(OAUTH_STATE_PATH),
        maxAge: 10 * 60_000,
      },
    );
    response.redirect(url);
  }

  async handleCallback(
    code: string,
    state: string,
    stored: string | undefined,
    response: Response,
  ) {
    response.clearCookie(
      OAUTH_STATE_COOKIE,
      this.sessionService.cookieOptions(OAUTH_STATE_PATH),
    );

    try {
      const {
        state: expectedState,
        verifier,
        rememberMe,
      } = JSON.parse(stored ?? '{}');
      if (!verifier || state !== expectedState) {
        throw new UnauthorizedException('Invalid login state');
      }

      const profile = await this.entraService.redeemCode(code, verifier);
      const user = await this.userService.upsertFromEntra(
        profile.oid,
        profile.email,
        profile.name,
      );
      await this.sessionService.completeLogin(
        user,
        rememberMe === true,
        response,
      );
      response.redirect(this.appConfig.frontendUrl);
    } catch (error) {
      this.logger.warn(`Entra login failed: ${(error as Error).message}`);
      response.redirect(`${this.appConfig.frontendUrl}/?error=auth_failed`);
    }
  }

  refresh(user: User, rememberMe: boolean, response: Response) {
    return this.sessionService.completeLogin(user, rememberMe, response);
  }

  async logout(userId: string, response: Response) {
    await this.userService.updateHashedRefreshToken(userId, null);
    response.clearCookie(ACCESS_COOKIE, { path: '/' });
    response.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    return { message: 'Logged out successfully' };
  }
}
