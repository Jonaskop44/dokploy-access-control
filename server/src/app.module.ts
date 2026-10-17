import {
  ClassSerializerInterceptor,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from './user/user.module.js';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';
import { AppConfigModule } from './config/app-config/app-config.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './config/prisma/prisma.module.js';
import { DokployModule } from './config/dokploy/dokploy.module.js';
import { ProjectModule } from './project/project.module.js';
import { LimitModule } from './limit/limit.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    AppConfigModule,
    UserModule,
    PrismaModule,
    DokployModule,
    AuthModule,
    ProjectModule,
    LimitModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
