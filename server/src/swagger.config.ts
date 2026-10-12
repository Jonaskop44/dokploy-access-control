import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildSwaggerDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Dokploy Access Control API')
    .setDescription('Dokploy Access Control API documentation')
    .setVersion('1.0')
    .addCookieAuth('accessToken')
    .build();

  return SwaggerModule.createDocument(app, config);
}
