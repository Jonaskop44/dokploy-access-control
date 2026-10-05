import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/app-config/app-config.service.js';
import { UserService } from '../../user/user.service.js';
import { REFRESH_COOKIE, SessionService } from '../session/session.service.js';
import { JwtPayload } from '../types/auth-jwtPayload.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    appConfigService: AppConfigService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.refreshToken ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: appConfigService.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload) {
    const refreshToken = request.cookies?.refreshToken;
    const userId = payload.id;

    const user = await this.sessionService.validateRefreshToken(
      userId,
      refreshToken,
    );
    return { ...user, rememberMe: payload.sub.rememberMe };
  }
}
