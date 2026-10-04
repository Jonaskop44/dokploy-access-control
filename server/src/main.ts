import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AppConfigService } from './config/app-config/app-config.service.js';
import { buildSwaggerDocument } from './swagger.config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const appConfigService = app.get(AppConfigService);

  // Reverse proxy (Traefik) is the single hop in front of this service,
  // so trust exactly one hop to get the real client IP from X-Forwarded-For.
  app.set('trust proxy', 1);

  app.use(cookieParser());
  app.enableCors({ origin: appConfigService.frontendUrl, credentials: true });
  app.setGlobalPrefix('api/v1');

  SwaggerModule.setup('api/v1/api-docs', app, buildSwaggerDocument(app), {
    jsonDocumentUrl: 'api/v1/api-docs-json',
  });

  await app.listen(appConfigService.port);
}

await bootstrap();
