import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AppConfigService } from '../config/app-config/app-config.service.js';
import { UserService } from '../user/user.service.js';
import { EntraService } from './entra/entra.service.js';
import { SessionService } from './session/session.service.js';

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

  async startLogin(response: Response) {
    const { url, state, verifier } =
      await this.entraService.createAuthRequest();
    response.cookie(OAUTH_STATE_COOKIE, JSON.stringify({ state, verifier }), {
      ...this.sessionService.cookieOptions(OAUTH_STATE_PATH),
      maxAge: 10 * 60_000,
    });
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
      const { state: expectedState, verifier } = JSON.parse(stored ?? '{}');
      if (!verifier || state !== expectedState) {
        throw new UnauthorizedException('Invalid login state');
      }

      const profile = await this.entraService.redeemCode(code, verifier);
      const user = await this.userService.upsertFromEntra(
        profile.oid,
        profile.email,
        profile.name,
      );
      await this.sessionService.completeLogin(user.id, response);
      response.redirect(this.appConfig.frontendUrl);
    } catch (error) {
      this.logger.warn(`Entra login failed: ${(error as Error).message}`);
      response.redirect(
        `${this.appConfig.frontendUrl}/login?error=auth_failed`,
      );
    }
  }

  refresh(userId: string, response: Response) {
    return this.sessionService.completeLogin(userId, response);
  }

  logout(userId: string, response: Response) {
    return this.sessionService.endSession(userId, response);
  }
}
