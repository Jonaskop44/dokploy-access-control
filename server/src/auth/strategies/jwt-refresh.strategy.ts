import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/app-config/app-config.service.js';
import { REFRESH_COOKIE } from '../session/session.service.js';
import { AuthService } from '../auth.service.js';
import { JwtPayload } from '../types/auth-jwtPayload.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    appConfigService: AppConfigService,
    private authService: AuthService,
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
    const token: string | undefined = request.cookies?.[REFRESH_COOKIE];
    const user = await this.userService.findByIdOrNull(payload.sub);
    if (
      !token ||
      !user?.hashedRefreshToken ||
      !(await this.sessionService.compareRefreshToken(
        token,
        user.hashedRefreshToken,
      ))
    ) {
      throw new UnauthorizedException();
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
