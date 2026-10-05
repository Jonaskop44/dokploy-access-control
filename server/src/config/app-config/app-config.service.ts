import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  //Server Configuration
  get isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  get port(): number {
    return this.configService.getOrThrow('PORT');
  }

  get domain(): string {
    return this.configService.getOrThrow('DOMAIN');
  }

  //Database Configuration
  get databaseUrl(): string {
    return this.configService.getOrThrow('DATABASE_URL');
  }

  //Auth Configuration
  get jwtAccessSecret(): string {
    return this.configService.getOrThrow('JWT_ACCESS_SECRET');
  }

  get jwtAccessExpiresIn(): string {
    return this.configService.getOrThrow('JWT_ACCESS_EXPIRES_IN');
  }

  get jwtRefreshSecret(): string {
    return this.configService.getOrThrow('JWT_REFRESH_SECRET');
  }

  jwtRefreshExpiresIn(rememberMe: boolean): string {
    const refreshExpiresInKey = rememberMe
      ? 'JWT_REFRESH_EXPIRES_IN'
      : 'JWT_REFRESH_SESSION_EXPIRES_IN';

    return this.configService.getOrThrow<string>(refreshExpiresInKey);
  }

  get cookieDomain(): string | undefined {
    return this.isProduction ? this.domain : undefined;
  }

  //Entra ID Configuration
  get entraTenantId(): string {
    return this.configService.getOrThrow('ENTRA_TENANT_ID');
  }

  get entraClientId(): string {
    return this.configService.getOrThrow('ENTRA_CLIENT_ID');
  }

  get entraClientSecret(): string {
    return this.configService.getOrThrow('ENTRA_CLIENT_SECRET');
  }

  get entraRedirectUri(): string {
    return this.configService.getOrThrow('ENTRA_REDIRECT_URI');
  }

  //CORS Configuration
  get frontendUrl(): string {
    return this.configService.getOrThrow('FRONTEND_URL');
  }
}
