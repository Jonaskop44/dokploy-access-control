import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EntraService } from './entra/entra.service.js';
import { SessionService } from './session/session.service.js';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy.js';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy.js';
import { UserService } from '../user/user.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    EntraService,
    SessionService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    UserService,
  ],
})
export class AuthModule {}
